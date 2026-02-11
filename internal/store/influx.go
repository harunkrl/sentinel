package store

import (
	"context"
	"fmt"
	"os"
	"regexp"
	"time"

	"sentinel/proto"

	influxdb2 "github.com/influxdata/influxdb-client-go/v2"
	"github.com/influxdata/influxdb-client-go/v2/api"
)

// validID matches safe identifiers: alphanumeric, dash, underscore, dot
var validID = regexp.MustCompile(`^[a-zA-Z0-9._-]+$`)

// validDurations is the whitelist of acceptable Flux duration strings
var validDurations = map[string]bool{
	"1m": true, "5m": true, "15m": true, "30m": true,
	"1h": true, "6h": true, "12h": true, "24h": true,
	"7d": true, "30d": true,
}

// sanitizeQueryParams validates agentID and duration to prevent Flux injection
func sanitizeQueryParams(agentID, duration string) error {
	if !validID.MatchString(agentID) {
		return fmt.Errorf("invalid agent ID: contains disallowed characters")
	}
	if !validDurations[duration] {
		return fmt.Errorf("invalid duration: %s", duration)
	}
	return nil
}

type InfluxStore struct {
	client   influxdb2.Client
	writeAPI api.WriteAPI
}

func NewInfluxStore() (*InfluxStore, error) {
	url := os.Getenv("INFLUXDB_URL")
	token := os.Getenv("INFLUXDB_TOKEN")
	org := os.Getenv("INFLUXDB_ORG")
	bucket := os.Getenv("INFLUXDB_BUCKET")

	if url == "" || token == "" || org == "" || bucket == "" {
		return nil, fmt.Errorf("missing influxdb configuration")
	}

	client := influxdb2.NewClient(url, token)
	writeAPI := client.WriteAPI(org, bucket)

	return &InfluxStore{
		client:   client,
		writeAPI: writeAPI,
	}, nil
}

// Fixed parameter type: *proto.MetricData
func (s *InfluxStore) WriteMetrics(agentID string, m *proto.MetricData) {
	p := influxdb2.NewPointWithMeasurement("system_metrics").
		AddTag("agent_id", agentID).
		AddField("cpu_usage", m.CpuPercent).
		AddField("ram_usage", m.RamUsedPercent).
		AddField("disk_usage", m.DiskUsedPercent).
		AddField("net_sent", m.NetSent).
		AddField("net_recv", m.NetRecv).
		AddField("temperature", m.TemperatureC).
		AddField("disk_read_mbps", m.DiskReadMbps).
		AddField("disk_write_mbps", m.DiskWriteMbps).
		SetTime(time.Now())

	s.writeAPI.WritePoint(p)
}

func (s *InfluxStore) Close() {
	s.writeAPI.Flush()
	s.client.Close()
}

func (s *InfluxStore) GetMetricsHistory(agentID string, duration string) ([]map[string]interface{}, error) {
	if err := sanitizeQueryParams(agentID, duration); err != nil {
		return nil, err
	}

	queryAPI := s.client.QueryAPI(os.Getenv("INFLUXDB_ORG"))
	bucket := os.Getenv("INFLUXDB_BUCKET")

	query := fmt.Sprintf(`from(bucket: "%s")
		|> range(start: -%s)
		|> filter(fn: (r) => r["_measurement"] == "system_metrics")
		|> filter(fn: (r) => r["agent_id"] == "%s")
		|> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
		|> sort(columns: ["_time"])`, bucket, duration, agentID)

	result, err := queryAPI.Query(context.Background(), query)
	if err != nil {
		return nil, err
	}

	var history []map[string]interface{}

	for result.Next() {
		record := result.Record()
		entry := make(map[string]interface{})
		entry["time"] = record.Time().Format(time.RFC3339)

		if v := record.ValueByKey("cpu_usage"); v != nil {
			entry["cpu_usage"] = v
		}
		if v := record.ValueByKey("ram_usage"); v != nil {
			entry["ram_usage"] = v
		}
		if v := record.ValueByKey("temperature"); v != nil {
			entry["temperature"] = v
		}
		if v := record.ValueByKey("net_sent"); v != nil {
			entry["net_sent"] = v
		}
		if v := record.ValueByKey("net_recv"); v != nil {
			entry["net_recv"] = v
		}

		if v := record.ValueByKey("disk_read_mbps"); v != nil {
			entry["disk_read_mbps"] = v
		}
		if v := record.ValueByKey("disk_write_mbps"); v != nil {
			entry["disk_write_mbps"] = v
		}

		if v := record.ValueByKey("disk_usage"); v != nil {
			entry["disk_usage"] = v
		}

		history = append(history, entry)
	}

	if result.Err() != nil {
		return nil, result.Err()
	}

	return history, nil
}

// MetricStats holds aggregated statistics for a metric
type MetricStats struct {
	Avg float64 `json:"avg"`
	Min float64 `json:"min"`
	Max float64 `json:"max"`
}

// AgentStats holds all metric statistics
type AgentStats struct {
	CPU         MetricStats `json:"cpu"`
	RAM         MetricStats `json:"ram"`
	Disk        MetricStats `json:"disk"`
	Temperature MetricStats `json:"temperature"`
	Range       string      `json:"range"`
}

func (s *InfluxStore) GetMetricsStats(agentID string, duration string) (*AgentStats, error) {
	if err := sanitizeQueryParams(agentID, duration); err != nil {
		return nil, err
	}

	queryAPI := s.client.QueryAPI(os.Getenv("INFLUXDB_ORG"))
	bucket := os.Getenv("INFLUXDB_BUCKET")

	// Query for aggregated stats
	query := fmt.Sprintf(`
		from(bucket: "%s")
			|> range(start: -%s)
			|> filter(fn: (r) => r["_measurement"] == "system_metrics")
			|> filter(fn: (r) => r["agent_id"] == "%s")
			|> filter(fn: (r) => r["_field"] == "cpu_usage" or r["_field"] == "ram_usage" or r["_field"] == "disk_usage" or r["_field"] == "temperature")
	`, bucket, duration, agentID)

	result, err := queryAPI.Query(context.Background(), query)
	if err != nil {
		return nil, err
	}

	// Collect all values per field
	fieldValues := make(map[string][]float64)
	for result.Next() {
		record := result.Record()
		field := record.Field()
		if val, ok := record.Value().(float64); ok {
			fieldValues[field] = append(fieldValues[field], val)
		}
	}

	if result.Err() != nil {
		return nil, result.Err()
	}

	// Calculate stats for each field
	calcStats := func(values []float64) MetricStats {
		if len(values) == 0 {
			return MetricStats{}
		}
		var sum, min, max float64
		min = values[0]
		max = values[0]
		for _, v := range values {
			sum += v
			if v < min {
				min = v
			}
			if v > max {
				max = v
			}
		}
		return MetricStats{
			Avg: sum / float64(len(values)),
			Min: min,
			Max: max,
		}
	}

	return &AgentStats{
		CPU:         calcStats(fieldValues["cpu_usage"]),
		RAM:         calcStats(fieldValues["ram_usage"]),
		Disk:        calcStats(fieldValues["disk_usage"]),
		Temperature: calcStats(fieldValues["temperature"]),
		Range:       duration,
	}, nil
}
