# GreenRide - Smart Carpooling & Commute Sharing Platform

GreenRide is an intelligent carpooling platform that matches users with similar routes and timings using AI-based route optimization. The system verifies user identities, displays trust ratings, and calculates environmental impact per trip. Real-time ride tracking, safety alerts, and digital wallets ensure a smooth experience.

## Features

- **AI-Based Route Matching**: Intelligent matching of users with similar routes and schedules
- **User Verification & Trust Ratings**: Verified profiles and trust-based system
- **Real-Time Tracking**: Live tracking of rides for safety and convenience
- **Environmental Impact**: Calculate and display CO₂ reduction and fuel savings
- **Digital Wallet**: Seamless in-app payments and fare splitting
- **Analytics Dashboard**: Visualize savings, environmental impact, and usage patterns

## Tech Stack

- **Frontend**: React.js, TailwindCSS, shadcn/ui
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Maps & Routing**: Google Maps API
- **Authentication**: JWT, OAuth
- **Real-time Features**: Socket.io
- **Deployment**: Docker, AWS/GCP

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/greenride.git
cd greenride
```

2. Install dependencies for backend
```bash
cd backend
npm install
```

3. Install dependencies for frontend
```bash
cd ../frontend
npm install
```

4. Set up environment variables
```bash
# In backend directory
cp .env.example .env
# Edit .env with your configuration
```

5. Run the development servers
```bash
# In backend directory
npm run dev

# In frontend directory (in a new terminal)
npm run dev
```

## Project Structure

```
greenride/
├── backend/             # Express.js server
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   └── utils/           # Utility functions
├── frontend/            # React.js client
│   ├── public/          # Static files
│   └── src/             # Source files
│       ├── components/  # Reusable components
│       ├── context/     # React context
│       ├── hooks/       # Custom hooks
│       ├── pages/       # Page components
│       ├── services/    # API services
│       └── utils/       # Utility functions
└── README.md            # Project documentation
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
