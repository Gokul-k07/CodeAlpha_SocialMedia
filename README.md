# GOSocial

GOSocial is a polished full-stack social media platform built with React, Vite, Express, MongoDB, JWT, and modern UI patterns. It includes authentication, a home feed, profile management, search, follows, comments, bookmarking, and hidden admin routes.

## Features
- Authentication with JWT and secure cookies
- Home feed with post creation and comments
- Follow/unfollow system
- Profile editing and avatar support
- Search users with instant results
- Responsive premium UI with animated transitions
- Admin dashboard endpoints for users and posts

## Tech Stack
- Frontend: React 19, Vite, React Router, Axios, Framer Motion, React Icons
- Backend: Node.js, Express.js, MongoDB, Mongoose, JWT, bcrypt

## Installation
### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
npm install
npm run dev
```

## Environment Variables
Create a `.env` file in the backend folder:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/novasocial
JWT_SECRET=your-secret
```

## Folder Structure
```text
frontend/src/
  components/
  pages/
  context/
  services/
backend/
  controllers/
  models/
  routes/
  middleware/
```

## Deployment
The app is ready to be deployed with a Node.js host and MongoDB Atlas.
