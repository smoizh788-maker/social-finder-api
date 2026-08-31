const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());


// ===============================
// HOME ROUTE
// ===============================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Social Finder API is running'
  });
});


// ===============================
// CHECK IF INPUT IS A URL
// ===============================

const isUrl = (value) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};


// ===============================
// GET PLATFORM FROM URL
// ===============================

const getPlatformFromUrl = (url) => {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('instagram.com')) return 'Instagram';
  if (lowerUrl.includes('tiktok.com')) return 'TikTok';
  if (lowerUrl.includes('facebook.com')) return 'Facebook';
  if (
    lowerUrl.includes('x.com') ||
    lowerUrl.includes('twitter.com')
  ) {
    return 'X / Twitter';
  }
  if (lowerUrl.includes('linkedin.com')) return 'LinkedIn';
  if (lowerUrl.includes('github.com')) return 'GitHub';
  if (
    lowerUrl.includes('youtube.com') ||
    lowerUrl.includes('youtu.be')
  ) {
    return 'YouTube';
  }

  return 'Public Profile';
};


// ===============================
// EXTRACT USERNAME FROM URL
// ===============================

const getUsernameFromUrl = (url) => {
  try {
    const parsed = new URL(url);

    const parts = parsed.pathname
      .split('/')
      .filter(Boolean);

    return parts[0]
      ? `@${parts[0]}`
      : 'Public Profile';

  } catch {
    return 'Unknown';
  }
};


// ===============================
// NORMALIZE PHONE NUMBER
// ===============================

const normalizePhone = (phone) => {
  let value = phone
    .trim()
    .replace(/[\s()-]/g, '');

  // Convert Pakistan format:
  // +923001234567
  // 923001234567
  // 03001234567
  // into 03001234567

  if (value.startsWith('+92')) {
    value = '0' + value.substring(3);
  }

  if (value.startsWith('92') && value.length === 12) {
    value = '0' + value.substring(2);
  }

  return value;
};


// ===============================
// CHECK IF PHONE NUMBER
// ===============================

const isPhoneNumber = (value) => {
  const phone = normalizePhone(value);

  return /^03\d{9}$/.test(phone);
};


// ===============================
// SEARCH ROUTE
// ===============================

app.post('/search', async (req, res) => {

  try {

    const { query } = req.body;


    // ===============================
    // VALIDATE INPUT
    // ===============================

    if (!query || !query.trim()) {

      return res.status(400).json({
        success: false,
        message: 'Username, phone number or public profile URL is required'
      });

    }


    let cleanQuery = query.trim();


    // ===============================
    // PHONE NUMBER SEARCH
    // ===============================

    if (isPhoneNumber(cleanQuery)) {

      const phone = normalizePhone(cleanQuery);

      const filePath = path.join(
        __dirname,
        'users.json'
      );


      // Check users.json exists

      if (!fs.existsSync(filePath)) {

        return res.status(500).json({
          success: false,
          message: 'users.json file not found'
        });

      }


      // Read users

      const users = JSON.parse(
        fs.readFileSync(filePath, 'utf8')
      );


      // Find user by phone

      const user = users.find(
        item => normalizePhone(item.phone) === phone
      );


      // No user found

      if (!user) {

        return res.json({
          success: true,
          query: phone,
          results: [],
          message: 'No social accounts found for this phone number'
        });

      }


      // Return social accounts

      return res.json({

        success: true,

        query: phone,

        name: user.name,

        results: user.accounts

      });

    }


    // ===============================
    // ADD HTTPS IF USER ENTERED WWW
    // ===============================

    if (cleanQuery.startsWith('www.')) {

      cleanQuery = `https://${cleanQuery}`;

    }


    const results = [];


    // ===============================
    // PUBLIC PROFILE URL SEARCH
    // ===============================

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


    // ===============================
    // USERNAME CLEANING
    // ===============================

    const username = cleanQuery
      .replace(/^@/, '')
      .replace(/\s/g, '');


    // ===============================
    // REAL PUBLIC GITHUB LOOKUP
    // ===============================

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

        const githubUser =
          await githubResponse.json();


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

      console.log(
        'GitHub lookup error:',
        error.message
      );

    }


    // ===============================
    // RETURN USERNAME RESULTS
    // ===============================

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


// ===============================
// START SERVER
// ===============================

const PORT =
  process.env.PORT || 3000;


app.listen(
  PORT,
  '0.0.0.0',
  () => {

    console.log(
      `Social Finder API running on port ${PORT}`
    );

  }
);
