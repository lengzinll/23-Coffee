# Next Play Live

A modern, real-time live streaming and video platform built with Next.js. Stream your content, engage with audiences, and enjoy seamless live entertainment.

## Overview

**Next Play Live** is a full-featured live streaming application that enables creators to broadcast live content to audiences worldwide. With real-time interactions, user authentication, and an intuitive interface, it's the perfect platform for gaming, education, entertainment, and more.

## Features

### Core Functionality
- **Live Streaming** - High-quality live video streaming with adaptive bitrate
- **Real-time Chat** - Live chat with moderators and community engagement tools
- **User Profiles** - Customizable creator and viewer profiles
- **Authentication** - Secure user registration and login
- **Search & Discovery** - Find and discover live streams and content
- **Follow System** - Follow favorite creators and get notifications
- **Stream History** - View past broadcasts and on-demand content

### Viewer Features
- **Watch Live** - Stream live content with low-latency playback
- **Interactive Chat** - Participate in real-time conversations
- **Quality Control** - Adjust video quality based on connection
- **Bookmarks** - Save favorite streams for later viewing

### Creator Features
- **Stream Management** - Create, schedule, and manage live streams
- **Analytics Dashboard** - Track viewers, engagement, and performance metrics
- **Moderation Tools** - Control chat and audience interactions
- **Customization** - Personalize your channel appearance

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library with hooks and state management
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components
- **Vercel AI SDK** - AI-powered features (optional)

### Backend
- **Next.js API Routes** - Serverless functions for backend logic
- **Supabase** - PostgreSQL database and real-time subscriptions
- **WebSocket** - Real-time chat and live updates
- **Authentication** - Secure session management

### Infrastructure & Services
- **Vercel** - Deployment and hosting
- **Blob Storage** - File and media storage
- **Vercel KV** - Real-time data cache
- **HLS Streaming** - Video streaming protocol

## Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm, yarn, or pnpm package manager
- Supabase account (for database)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/next-play-live.git
   cd next-play-live
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```

4. **Run the development server**
   ```bash
   pnpm dev
   # or
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
next-play-live/
├── app/
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   ├── live/                # Live streaming pages
│   ├── creator/             # Creator dashboard
│   └── api/                 # API routes
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── StreamPlayer.tsx     # Video player component
│   ├── ChatBox.tsx          # Real-time chat component
│   └── ...                  # Other components
├── lib/
│   ├── supabase.ts          # Supabase client
│   └── utils.ts             # Utility functions
├── hooks/
│   └── useStream.ts         # Custom hooks
├── public/                  # Static assets
├── styles/                  # Global styles
└── package.json
```

## Usage

### For Viewers
1. **Create an Account** - Sign up to access personalized features
2. **Browse Streams** - Explore live broadcasts on the home page
3. **Watch Live** - Click on a stream to watch in real-time
4. **Engage** - Participate in chat, send emotes, and support creators

### For Creators
1. **Set Up Channel** - Complete your creator profile
2. **Go Live** - Start broadcasting with a single click
3. **Manage Stream** - Control chat, moderation, and stream settings
4. **Monitor Analytics** - Track performance and audience insights

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Streams
- `GET /api/streams` - Get live streams
- `POST /api/streams` - Create new stream
- `GET /api/streams/[id]` - Get stream details
- `DELETE /api/streams/[id]` - End stream

### Chat
- `POST /api/chat/messages` - Send message
- `GET /api/chat/messages/[streamId]` - Get chat messages

### Users
- `GET /api/users/[id]` - Get user profile
- `PUT /api/users/[id]` - Update profile

## Database Schema

### Users Table
- `id` - Unique identifier
- `email` - User email
- `username` - Display name
- `avatar_url` - Profile picture
- `bio` - User biography
- `is_creator` - Creator status
- `created_at` - Account creation date

### Streams Table
- `id` - Stream identifier
- `creator_id` - User ID of creator
- `title` - Stream title
- `description` - Stream description
- `thumbnail_url` - Thumbnail image
- `status` - Live/Ended/Scheduled
- `viewer_count` - Current viewers
- `start_time` - Stream start time
- `end_time` - Stream end time

### Chat Messages Table
- `id` - Message identifier
- `stream_id` - Associated stream
- `user_id` - Message sender
- `content` - Message text
- `created_at` - Message timestamp

## Deployment

### Deploy to Vercel
1. **Push to GitHub** - Commit and push your code
2. **Connect to Vercel** - Import your repository
3. **Configure Environment** - Add environment variables
4. **Deploy** - Click deploy to go live

```bash
# One-click deployment
vercel
```

## Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch** - `git checkout -b feature/amazing-feature`
3. **Commit changes** - `git commit -m 'Add amazing feature'`
4. **Push to branch** - `git push origin feature/amazing-feature`
5. **Open Pull Request** - Submit your changes for review

### Development Guidelines
- Follow TypeScript best practices
- Write meaningful commit messages
- Test your code before submitting
- Update documentation as needed

## Performance Optimization

- **Image Optimization** - Next.js Image component for responsive images
- **Code Splitting** - Automatic code splitting for faster load times
- **Caching** - Server-side and client-side caching strategies
- **CDN Delivery** - Global content delivery through Vercel
- **Compression** - GZIP compression for assets

## Security

- **HTTPS** - All connections encrypted
- **SQL Injection Prevention** - Parameterized queries via Supabase ORM
- **XSS Protection** - Input sanitization and output encoding
- **CSRF Protection** - Token-based request validation
- **Rate Limiting** - API rate limiting to prevent abuse
- **Authentication** - Secure session management

## Roadmap

### Phase 1 (Current)
- [x] User authentication
- [x] Basic live streaming
- [x] Real-time chat
- [x] Search functionality

### Phase 2 (Upcoming)
- [ ] Monetization features (subscriptions, tips)
- [ ] Advanced analytics
- [ ] Multi-language support
- [ ] Mobile app
- [ ] Clip creation and sharing

### Phase 3 (Future)
- [ ] AI-powered moderation
- [ ] Interactive features (polls, games)
- [ ] Live shopping integration
- [ ] Premium content

## Troubleshooting

### Stream not loading?
- Check your internet connection
- Verify Supabase credentials in `.env.local`
- Clear browser cache and reload

### Chat messages not appearing?
- Ensure WebSocket connection is active
- Check browser console for errors
- Verify real-time subscriptions are enabled in Supabase

### Video player issues?
- Update to the latest browser version
- Try a different browser
- Disable browser extensions that might interfere

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

- **Documentation** - [Read the docs](https://docs.example.com)
- **Issues** - [GitHub Issues](https://github.com/yourusername/next-play-live/issues)
- **Discussions** - [GitHub Discussions](https://github.com/yourusername/next-play-live/discussions)
- **Email** - support@nextplaylive.com

## Acknowledgments

- Next.js team for the excellent framework
- Supabase for database and real-time features
- shadcn/ui for beautiful components
- Vercel for hosting and deployment

---

**Next Play Live** - Stream. Engage. Play.

Made with ❤️ by the community
