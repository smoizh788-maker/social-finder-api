const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Home route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Social Finder API is running'
  });
});

// Check if input is a URL
const isUrl = (value) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

// Get platform name from URL
const getPlatformFromUrl = (url) => {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('instagram.com')) return 'Instagram';
  if (lowerUrl.includes('tiktok.com')) return 'TikTok';
  if (lowerUrl.includes('facebook.com')) return 'Facebook';
  if (lowerUrl.includes('x.com') || lowerUrl.includes('twitter.com')) return 'X / Twitter';
  if (lowerUrl.includes('linkedin.com')) return 'LinkedIn';
  if (lowerUrl.includes('github.com')) return 'GitHub';
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'YouTube';

  return 'Public Profile';
};

// Extract username from URL
const getUsernameFromUrl = (url) => {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname
      .split('/')
      .filter(Boolean);

    return parts[0] ? `@${parts[0]}` : 'Public Profile';
  } catch {
    return 'Unknown';
  }
};

// Search route
app.post('/search', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Username or public profile URL is required'
      });
    }

    let cleanQuery = query.trim();

    // Add https if user entered www.
    if (
      cleanQuery.startsWith('www.')
    ) {
      cleanQuery = `https://${cleanQuery}`;
    }

    const results = [];

    // If user enters a public profile URL
    if (isUrl(cleanQuery)) {
      results.push({
        id: 'url-result',
        platform: getPlatformFromUrl(cleanQuery),
        username: getUsernameFromUrl(cleanQuery),
        url: cleanQuery,
        verified: false
      });

      return res.json({
        success: true,
        query: cleanQuery,
        results
      });
    }

    // Clean username
    const username = cleanQuery
      .replace(/^@/, '')
      .replace(/\s/g, '');

    // REAL public GitHub lookup
    try {
      const githubResponse = await fetch(
        `https://api.github.com/users/${encodeURIComponent(username)}`,
        {
          headers: {
            'User-Agent': 'Social-Finder-App'
          }
        }
      );

      if (githubResponse.ok) {
        const githubUser = await githubResponse.json();

        results.push({
          id: `github-${githubUser.id}`,
          platform: 'GitHub',
          username: `@${githubUser.login}`,
          name: githubUser.name || '',
          avatar: githubUser.avatar_url || '',
          url: githubUser.html_url,
          verified: true
        });
      }
    } catch (error) {
      console.log('GitHub lookup error:', error.message);
    }

    // Return results
    res.json({
      success: true,
      query: username,
      results
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Social Finder API running on port ${PORT}`);
});
