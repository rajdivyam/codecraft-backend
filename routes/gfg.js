const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');

// GET /api/gfg/:username - fetch GFG stats for a user
router.get('/:username', async (req, res) => {
  const { username } = req.params;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    // --- Strategy 1: GFG's internal practice API ---
    try {
      const apiRes = await axios.get(
        `https://practiceapi.geeksforgeeks.org/api/v1/user/score/?handle=${username}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Referer': 'https://www.geeksforgeeks.org/'
          },
          timeout: 8000
        }
      );

      if (apiRes.data && !apiRes.data.error) {
        const d = apiRes.data;
        return res.json({
          totalProblemsSolved: d.problems_solved_count || 0,
          codingScore: d.score || 0,
          instituteRank: d.institute_rank || null,
          easy: d.school_count || 0,
          medium: d.basic_count || 0,
          hard: d.hard_count || 0,
        });
      }
    } catch (e1) {
      // fallthrough to strategy 2
    }

    // --- Strategy 2: Scrape /user/{username} page ---
    const pageUrl = `https://www.geeksforgeeks.org/user/${username}/`;
    const response = await axios.get(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      timeout: 12000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Helper: extract first match from regex
    const matchNum = (regex) => {
      const m = html.match(regex);
      return m ? parseInt(m[1]) || 0 : null;
    };

    // Try to find JSON data embedded in __NEXT_DATA__ or script tags
    let totalProblemsSolved = null;
    let codingScore = null;
    let instituteRank = null;
    let easy = null, medium = null, hard = null;

    // Parse __NEXT_DATA__ JSON
    const nextDataScript = $('script#__NEXT_DATA__').html();
    if (nextDataScript) {
      try {
        const nextData = JSON.parse(nextDataScript);
        const props = nextData?.props?.pageProps || nextData?.props || {};

        // Try to walk the tree to find user stats
        const jsonStr = JSON.stringify(props);
        totalProblemsSolved = matchNum(/"totalProblemsSolved"\s*:\s*(\d+)/) || matchNum(/"problems_solved"\s*:\s*(\d+)/);
        codingScore = matchNum(/"codingScore"\s*:\s*(\d+)/) || matchNum(/"score"\s*:\s*(\d+)/);
        instituteRank = matchNum(/"instituteRank"\s*:\s*(\d+)/) || matchNum(/"institute_rank"\s*:\s*(\d+)/);
        easy = matchNum(/"Easy"\s*:\s*(\d+)/i) || matchNum(/"easy"\s*:\s*(\d+)/i);
        medium = matchNum(/"Medium"\s*:\s*(\d+)/i) || matchNum(/"medium"\s*:\s*(\d+)/i);
        hard = matchNum(/"Hard"\s*:\s*(\d+)/i) || matchNum(/"hard"\s*:\s*(\d+)/i);
      } catch (e) { /* ignore parse errors */ }
    }

    // Also scan all embedded script content for JSON patterns
    if (totalProblemsSolved === null) {
      totalProblemsSolved = matchNum(/"totalProblemsSolved"\s*:\s*(\d+)/i) || matchNum(/problem_heading[^>]*>(\d+)/i);
    }
    if (codingScore === null) {
      codingScore = matchNum(/"codingScore"\s*:\s*(\d+)/i) || matchNum(/Overall Coding Score[^0-9]*(\d+)/i) || matchNum(/coding_score[^0-9]*(\d+)/i);
    }
    if (instituteRank === null) {
      instituteRank = matchNum(/"instituteRank"\s*:\s*(\d+)/i) || matchNum(/Institute Rank[^0-9]*(\d+)/i);
    }
    if (easy === null) {
      easy = matchNum(/"Easy"\s*:\s*"?(\d+)"?/i);
    }
    if (medium === null) {
      medium = matchNum(/"Medium"\s*:\s*"?(\d+)"?/i);
    }
    if (hard === null) {
      hard = matchNum(/"Hard"\s*:\s*"?(\d+)"?/i);
    }

    // Cheerio-based DOM scraping as last resort
    if (totalProblemsSolved === null) {
      // GFG shows problems solved in a score card
      const scoreText = $('.score_card_value, .scoreCard_head_left--score__oSi_x, [class*="score_card"] span').first().text().trim();
      totalProblemsSolved = parseInt(scoreText) || null;
    }

    // If we couldn't find any data, return error
    if (totalProblemsSolved === null && codingScore === null) {
      return res.status(404).json({ error: 'Could not find user data' });
    }

    return res.json({
      totalProblemsSolved: totalProblemsSolved || 0,
      codingScore: codingScore || 0,
      instituteRank: instituteRank || null,
      easy: easy || 0,
      medium: medium || 0,
      hard: hard || 0,
    });

  } catch (error) {
    console.error('GFG fetch error:', error.message);
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(500).json({ error: 'Failed to fetch GFG stats' });
  }
});

module.exports = router;
