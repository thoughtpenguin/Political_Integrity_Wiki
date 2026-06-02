# The Political Integrity Wiki

<img width="1202" height="456" alt="Screenshot 2026-05-28 at 5 51 03 PM" src="https://github.com/user-attachments/assets/5aae4302-6e1b-4086-88f4-f2c046a5bf97" />

An open-source, semi-decentralized platform for tracking U.S. campaign finance and political accountability. Using truth algorithms inspired by Reddit and prediction markets, the community crowdsources and verifies data that isn't always captured in automated feeds.

## Tech Stack

- **Frontend**: [Next.js 16](https://nextjs.org/) (App Router, TypeScript, Tailwind CSS)
- **Backend**: [Firebase Cloud Functions](https://firebase.google.com/docs/functions) (Python 3.13+)
- **Database**: [Cloud Firestore](https://firebase.google.com/docs/firestore)
- **Hosting**: [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)
- **Data Source**: [OpenFEC API](https://api.open.fec.gov/developers/)

## Project Structure

- `app/`: Next.js frontend application.
- `functions/`: Python Cloud Functions for data ingestion and credibility calculations.
- `lib/`: Shared TypeScript utilities, type definitions, and Firestore data fetching layers.
- `public/`: Static assets.
- `firestore.rules`: Security rules for database access.

## Getting Started

### Prerequisites

- **Node.js**: v20 or higher
- **Python**: v3.11 or higher
- **Firebase CLI**: `npm install -g firebase-tools`
- **Java JDK**: v11 or higher (needed for emulation)

### Installation & Setup

1. **Clone and Install Dependencies**:
   ```bash
   git clone <repository-url>
   cd political_integrity_wiki
   npm install
   ```

2. **Configure Python Functions**:
   ```bash
   cd functions
   python3 -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Environment Variables**:
   In the `functions/` directory, copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Add your [FEC API Key](https://api.open.fec.gov/developers) to the `.env` file.

4. **Run Local Emulators**:
   From the **root** directory:
   ```bash
   npm run emulate
   ```

### Accessing the Project

Once the emulators are running:
- **Web App**: [http://localhost:5002](http://localhost:5002)
- **Firebase Emulator UI**: [http://localhost:4000](http://localhost:4000) (Use this to inspect the database and logs)

## ⚖️ How It Works

### The Credibility System
Users earn **Credibility Points** by submitting verified information and having their proposals upvoted by the community. High-credibility users can:
- Propose data for state and local candidates.
- Verify "Badges" (e.g., "Corporate PAC Money Pledge") with video/text citations.
- Have their votes carry more weight in the "Truth Algorithm."

### Data Ingestion
The system automatically merges FEC data when a candidate's FEC ID is provided. If multiple IDs exist for one person (e.g., across different cycles), the system handles the aggregation and merging of financial totals.
