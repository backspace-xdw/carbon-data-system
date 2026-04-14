#!/bin/bash
set -e

# Wait for InfluxDB to be ready
until influx ping 2>/dev/null; do
  echo "Waiting for InfluxDB..."
  sleep 2
done

echo "Creating additional buckets..."

influx bucket create --name energy_hourly --retention 365d --org carbon-system 2>/dev/null || echo "energy_hourly already exists"
influx bucket create --name energy_daily --retention 1825d --org carbon-system 2>/dev/null || echo "energy_daily already exists"
influx bucket create --name carbon_emissions --retention 1825d --org carbon-system 2>/dev/null || echo "carbon_emissions already exists"
influx bucket create --name device_status --retention 30d --org carbon-system 2>/dev/null || echo "device_status already exists"

echo "InfluxDB initialization complete!"
