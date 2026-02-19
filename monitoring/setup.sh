#!/bin/bash

# Execora Monitoring Setup Script
# This script sets up the complete observability stack

set -e

echo "🚀 Setting up Execora Observability Stack..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Install dependencies
echo -e "${YELLOW}📦 Installing Node.js dependencies...${NC}"
npm install prom-client@15.1.0
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 2: Create logs directory
echo -e "${YELLOW}📁 Creating logs directory...${NC}"
mkdir -p logs
echo -e "${GREEN}✅ Logs directory created${NC}"
echo ""

# Step 3: Start monitoring stack
echo -e "${YELLOW}🐳 Starting monitoring services with Docker Compose...${NC}"
docker-compose -f docker-compose.monitoring.yml up -d
echo -e "${GREEN}✅ Monitoring services started${NC}"
echo ""

# Step 4: Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 10

# Check if Prometheus is ready
until curl -s http://localhost:9090/-/ready > /dev/null 2>&1; do
    echo "Waiting for Prometheus..."
    sleep 2
done
echo -e "${GREEN}✅ Prometheus is ready${NC}"

# Check if Grafana is ready
until curl -s http://localhost:3001/api/health > /dev/null 2>&1; do
    echo "Waiting for Grafana..."
    sleep 2
done
echo -e "${GREEN}✅ Grafana is ready${NC}"

# Check if Loki is ready
until curl -s http://localhost:3100/ready > /dev/null 2>&1; do
    echo "Waiting for Loki..."
    sleep 2
done
echo -e "${GREEN}✅ Loki is ready${NC}"

echo ""
echo -e "${GREEN}🎉 Monitoring stack is ready!${NC}"
echo ""
echo "================================================"
echo "  Access your dashboards:"
echo "================================================"
echo ""
echo "  📊 Grafana:    http://localhost:3001"
echo "     Username: admin"
echo "     Password: admin"
echo ""
echo "  📈 Prometheus: http://localhost:9090"
echo "  📝 Loki:       http://localhost:3100"
echo ""
echo "================================================"
echo "  Next steps:"
echo "================================================"
echo ""
echo "  1. Start your Execora application:"
echo "     npm run dev"
echo ""
echo "  2. Generate some traffic to see metrics"
echo ""
echo "  3. View metrics endpoint:"
echo "     curl http://localhost:3000/metrics"
echo ""
echo "  4. Open Grafana and explore pre-built dashboards"
echo ""
echo "================================================"
echo ""
echo "To stop monitoring services:"
echo "  docker-compose -f docker-compose.monitoring.yml down"
echo ""
echo "To view logs:"
echo "  docker-compose -f docker-compose.monitoring.yml logs -f"
echo ""
