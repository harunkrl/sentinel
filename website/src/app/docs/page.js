import styles from './docs.module.css'

export default function DocsPage() {
    return (
        <article>
            <h1>Sentinel - Technical Architecture</h1>

            <p>
                Sentinel is a platform designed to monitor and manage distributed systems.
                It consists of three main components:
            </p>

            <div className={styles.codeBlock}>
                <pre>{`
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Frontend  │────▶│   Core Server   │◀────│     Agents      │
│    (React)      │REST │      (Go)       │gRPC │      (Go)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
              ┌─────────┐ ┌─────────┐ ┌─────────┐
              │InfluxDB │ │ SQLite  │ │  Ntfy   │
              │(Metrics)│ │(Config) │ │(Alerts) │
              └─────────┘ └─────────┘ └─────────┘
        `}</pre>
            </div>

            <h2>1. Overview</h2>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Technology</th>
                        <th>Why Selected?</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Go</strong></td>
                        <td>Low memory usage, cross-compile support, easy deployment</td>
                    </tr>
                    <tr>
                        <td><strong>gRPC</strong></td>
                        <td>Bidirectional streaming, low latency, type safety with Protobuf</td>
                    </tr>
                    <tr>
                        <td><strong>InfluxDB</strong></td>
                        <td>Optimized for time-series data, high write throughput</td>
                    </tr>
                </tbody>
            </table>

            <h2>2. Backend Architecture</h2>
            <h3>Directory Structure</h3>
            <div className={styles.codeBlock}>
                <pre>{`cmd/
├── core/main.go      # Main server entry point
└── agent/main.go     # Agent entry point

internal/
├── server/
│   ├── grpc.go       # gRPC handlers
│   └── http.go       # REST API handlers
├── store/
│   ├── db.go         # SQLite operations
│   └── influx.go     # InfluxDB operations
`}</pre>
            </div>

            <h2>3. Communication Protocols</h2>
            <p>
                Sentinel uses <strong>gRPC</strong> for high-performance agent communication
                and <strong>REST API</strong> for the frontend dashboard.
            </p>

            <h3>Protobuf Definitions</h3>
            <div className={styles.codeBlock}>
                <pre>{`// proto/service.proto
service SystemMonitor {
    rpc StreamTelemetry(stream Telemetry) returns (stream Command);
}

message Telemetry {
    enum Type {
        HANDSHAKE = 0;
        METRICS = 1;
        COMMAND_RESULT = 2;
    }
    // ...
}`}</pre>
            </div>

            <h2>4. Security</h2>
            <ul>
                <li><strong>JWT Authentication:</strong> Secure API access with expiration.</li>
                <li><strong>Rate Limiting:</strong> Protection against brute force and DDoS.</li>
                <li><strong>Separation of Concerns:</strong> Isolated modules for better security and maintainability.</li>
            </ul>

            <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--card-border)' }}>
                <p><em>For more details, check the source code on GitHub.</em></p>
            </div>
        </article>
    )
}
