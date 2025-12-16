# Deployment Guide

This guide covers deploying your ecommerce application to various platforms.

## Pre-Deployment Checklist

- [ ] Update `JWT_SECRET` in `.env` to a strong random value
- [ ] Update `NODE_ENV` to `production`
- [ ] Update `MONGODB_URI` to your production database
- [ ] Change `PORT` if needed
- [ ] Test all features locally
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Ensure all environment variables are set
- [ ] Enable HTTPS/SSL
- [ ] Setup database backups

## Security Configuration

### Environment Variables
```env
# Production .env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://user:password@host:port/database
JWT_SECRET=use_a_very_long_random_string_here_min_32_chars
```

### Generate Strong JWT Secret
```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String([System.Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes(32))
```

## Deployment Options

### 1. Heroku (Easiest)

#### Prerequisites
- Heroku account
- Heroku CLI installed
- MongoDB Atlas account (free tier available)

#### Steps

```bash
# Login to Heroku
heroku login

# Create new Heroku app
heroku create your-app-name

# Set environment variables
heroku config:set JWT_SECRET="your_secret_here"
heroku config:set MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/dbname"
heroku config:set NODE_ENV="production"

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

#### Procfile (Create this file in root)
```
web: npm start
```

### 2. DigitalOcean App Platform

#### Steps

1. Connect GitHub repository
2. Select Node.js as language
3. Set environment variables in dashboard
4. Set start command: `npm start`
5. Deploy

### 3. DigitalOcean Droplet (VPS)

#### Setup

```bash
# SSH into droplet
ssh root@your_droplet_ip

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Install MongoDB (optional)
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org

# Start MongoDB
systemctl start mongod
systemctl enable mongod

# Install Nginx
apt install -y nginx

# Clone repository
cd /var/www
git clone https://github.com/yourusername/eCommerceCredit.git
cd eCommerceCredit

# Install dependencies
npm install

# Create .env file
nano .env
# Add your production settings

# Install PM2
npm install -g pm2

# Start app with PM2
pm2 start backend/server.js --name "ecommerce"
pm2 startup
pm2 save
```

#### Nginx Configuration

Create `/etc/nginx/sites-available/default`:

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Test Nginx
nginx -t

# Start Nginx
systemctl start nginx
systemctl enable nginx
```

### 4. AWS EC2

#### Setup

1. Launch Ubuntu 22.04 LTS instance
2. Configure security group (allow 80, 443, 22)
3. SSH into instance
4. Follow DigitalOcean Droplet steps above
5. Use SSL with Let's Encrypt (see SSL section below)

### 5. Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://mongo:27017/ecommerce
      JWT_SECRET: your_secret_here
    depends_on:
      - mongo
    
  mongo:
    image: mongo:7.0
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

volumes:
  mongo_data:
```

Deploy:
```bash
docker-compose up -d
```

## SSL/HTTPS Setup

### Using Let's Encrypt with Certbot

```bash
# Install Certbot
apt install certbot python3-certbot-nginx

# Get certificate
certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Update Nginx config to use SSL
nano /etc/nginx/sites-available/default

# Add:
# ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

# Restart Nginx
systemctl restart nginx

# Auto-renewal (runs automatically)
certbot renew --dry-run
```

## Database Setup

### MongoDB Atlas (Cloud)

1. Go to mongodb.com/cloud/atlas
2. Create free account
3. Create cluster
4. Create database user
5. Get connection string
6. Use in `MONGODB_URI` environment variable

### Local MongoDB

```bash
# Install MongoDB
# (Varies by OS - see mongodb.org)

# Start MongoDB
mongod

# In another terminal, seed database
npm run seed
```

## Performance Optimization

### Add Caching Headers (Nginx)

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 7d;
    add_header Cache-Control "public, immutable";
}
```

### Enable Gzip Compression (Nginx)

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1000;
gzip_types text/plain text/css application/json application/javascript;
```

### Optimize Node.js

```bash
# Use production mode
NODE_ENV=production npm start

# Use cluster mode with PM2
pm2 start backend/server.js -i max --name "ecommerce"
```

## Monitoring

### PM2 Monitoring

```bash
# Install PM2 Plus (optional)
pm2 plus

# View real-time stats
pm2 monit
```

### Log Management

```bash
# View PM2 logs
pm2 logs

# Rotate logs
pm2 install pm2-logrotate
```

## Backup Strategy

### Database Backups

```bash
# Monthly MongoDB backup
mongodump --out=/backups/$(date +%Y-%m-%d)

# Backup to cloud storage (AWS S3)
aws s3 sync /backups s3://my-backup-bucket/
```

### File Backups

```bash
# Backup uploads directory
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz backend/uploads/

# Upload to cloud
aws s3 cp uploads_backup_*.tar.gz s3://my-backup-bucket/
```

## Health Checks

### Application Health Endpoint

Add to `backend/server.js`:

```javascript
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});
```

### Load Balancer Health Check

Point to: `http://your-app/health`

## Scaling

### Horizontal Scaling (Multiple Servers)

1. Use load balancer (AWS ELB, Nginx)
2. Deploy app on multiple instances
3. Use shared database (MongoDB Atlas)
4. Use shared file storage (AWS S3, etc.)

### Vertical Scaling (Bigger Server)

1. Increase server resources (CPU, RAM)
2. Optimize Node.js and database queries
3. Add caching layer (Redis)

## Troubleshooting

### Server Not Starting

```bash
# Check logs
pm2 logs

# Check port
lsof -i :5000

# Check environment
pm2 show ecommerce
```

### Database Connection Failed

```bash
# Test connection
mongo "mongodb+srv://user:pass@host/database"

# Check firewall
ufw status
ufw allow 27017
```

### File Upload Issues

```bash
# Check permissions
ls -la backend/uploads/

# Fix permissions
chmod 755 backend/uploads/
chown www-data:www-data backend/uploads/
```

## Post-Deployment Checklist

- [ ] Test all features on production
- [ ] Monitor server logs
- [ ] Check database performance
- [ ] Verify SSL certificate
- [ ] Test file uploads
- [ ] Check email notifications (if added)
- [ ] Setup monitoring alerts
- [ ] Setup automated backups
- [ ] Document deployment process
- [ ] Test disaster recovery plan

## Useful Commands

```bash
# SSH into server
ssh user@your-domain.com

# View running processes
ps aux | grep node

# Check disk space
df -h

# Check memory usage
free -h

# Update system
apt update && apt upgrade

# Restart application
pm2 restart ecommerce

# View logs
pm2 logs ecommerce

# Stop application
pm2 stop ecommerce
```

## Support & Resources

- [Node.js Deployment](https://nodejs.org/en/docs/guides/nodejs-web-application/#deploying-to-production)
- [Express.js Production Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [MongoDB Deployment](https://docs.mongodb.com/manual/administration/security/)
- [Nginx Documentation](https://nginx.org/en/docs/)

---

**Remember:** Always test in staging environment before deploying to production!
