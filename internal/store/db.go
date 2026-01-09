package store

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite" // Pure Go SQLite driver
)

type Store struct {
	db *sql.DB
}

// Agent model for DB
type Agent struct {
	Hostname        string
	IP              string
	OS              string
	Arch            string
	Status          string // online, offline
	LastSeen        int64
	Platform        string
	PlatformVersion string
	BootTime        uint64
	Tags            string // JSON or comma-separated
}

// AuditLog model
type AuditLog struct {
	ID        int64
	Timestamp int64
	Action    string
	Target    string
	Details   string
}

// User model
type User struct {
	Username string
	Password string // Hashed
	Role     string
}

func NewStore(dataDir string) (*Store, error) {
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, err
	}

	dbPath := filepath.Join(dataDir, "sentinel.db")
	// Use WAL mode for better concurrency and set busy timeout
	dsn := fmt.Sprintf("%s?_journal_mode=WAL&_busy_timeout=5000&_synchronous=NORMAL", dbPath)
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	s := &Store{db: db}
	if err := s.initSchema(); err != nil {
		return nil, err
	}

	return s, nil
}

func (s *Store) initSchema() error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS agents (
			hostname TEXT PRIMARY KEY,
			ip TEXT,
			os TEXT,
			arch TEXT,
			status TEXT,
			last_seen INTEGER,
			platform TEXT,
			platform_version TEXT,
			boot_time INTEGER,
			tags TEXT
		);`,
		`CREATE TABLE IF NOT EXISTS audit_logs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			timestamp INTEGER,
			action TEXT,
			target TEXT,
			details TEXT
		);`,
		// Future: Users table
		`CREATE TABLE IF NOT EXISTS users (
			username TEXT PRIMARY KEY,
			password_hash TEXT,
			role TEXT
		);`,
	}

	for _, q := range queries {
		if _, err := s.db.Exec(q); err != nil {
			return err
		}
	}
	return nil
}

// --- AGENT OPERATIONS ---

func (s *Store) UpsertAgent(a Agent) error {
	query := `INSERT INTO agents (hostname, ip, os, arch, status, last_seen, platform, platform_version, boot_time) 
	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	ON CONFLICT(hostname) DO UPDATE SET
	ip=excluded.ip,
	status=excluded.status,
	last_seen=excluded.last_seen,
	boot_time=excluded.boot_time;`

	_, err := s.db.Exec(query, a.Hostname, a.IP, a.OS, a.Arch, a.Status, a.LastSeen, a.Platform, a.PlatformVersion, a.BootTime)
	return err
}

func (s *Store) UpdateAgentStatus(hostname, status string, lastSeen int64) error {
	_, err := s.db.Exec("UPDATE agents SET status = ?, last_seen = ? WHERE hostname = ?", status, lastSeen, hostname)
	return err
}

func (s *Store) GetAgents() ([]Agent, error) {
	rows, err := s.db.Query("SELECT hostname, ip, os, arch, status, last_seen, platform, platform_version, boot_time FROM agents")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var agents []Agent
	for rows.Next() {
		var a Agent
		if err := rows.Scan(&a.Hostname, &a.IP, &a.OS, &a.Arch, &a.Status, &a.LastSeen, &a.Platform, &a.PlatformVersion, &a.BootTime); err != nil {
			return nil, err
		}
		agents = append(agents, a)
	}
	return agents, nil
}

func (s *Store) DeleteAgent(hostname string) error {
	_, err := s.db.Exec("DELETE FROM agents WHERE hostname = ?", hostname)
	return err
}

// --- AUDIT OPERATIONS ---

func (s *Store) AddAuditLog(action, target, details string) error {
	_, err := s.db.Exec("INSERT INTO audit_logs (timestamp, action, target, details) VALUES (?, ?, ?, ?)", time.Now().Unix(), action, target, details)
	return err
}

func (s *Store) GetAuditLogs(limit int) ([]AuditLog, error) {
	rows, err := s.db.Query("SELECT id, timestamp, action, target, details FROM audit_logs ORDER BY timestamp DESC LIMIT ?", limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []AuditLog
	for rows.Next() {
		var l AuditLog
		if err := rows.Scan(&l.ID, &l.Timestamp, &l.Action, &l.Target, &l.Details); err != nil {
			return nil, err
		}
		logs = append(logs, l)
	}
	return logs, nil
}

// ClearHistory removes all audit logs (User Request)
func (s *Store) ClearAuditHistory() error {
	_, err := s.db.Exec("DELETE FROM audit_logs")
	return err
}

// --- USER OPERATIONS ---

func (s *Store) CreateUser(username, passwordHash, role string) error {
	_, err := s.db.Exec("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)", username, passwordHash, role)
	return err
}

func (s *Store) GetUser(username string) (*User, error) {
	row := s.db.QueryRow("SELECT username, password_hash, role FROM users WHERE username = ?", username)
	var u User
	if err := row.Scan(&u.Username, &u.Password, &u.Role); err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *Store) UpdateUserPassword(username, passwordHash string) error {
	result, err := s.db.Exec("UPDATE users SET password_hash = ? WHERE username = ?", passwordHash, username)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("user not found")
	}
	return nil
}
