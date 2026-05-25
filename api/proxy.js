export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Auth-Token');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { source, url } = req.query;
  
  console.log('Proxy request:', { source, url });
  
  if (!source || !url) {
    return res.status(400).json({ error: 'Missing source or url parameter' });
  }
  
  const API_KEYS = {
    'football-data': process.env.FOOTBALL_DATA_API_KEY,
    'api-football': process.env.API_FOOTBALL_KEY
  };
  
  const API_BASES = {
    'football-data': 'https://api.football-data.org/v4',
    'api-football': 'https://v3.football.api-sports.io'
  };
  
  const apiKey = API_KEYS[source];
  const baseUrl = API_BASES[source];
  
  if (!apiKey) {
    console.error(`API key not configured for: ${source}`);
    return res.status(500).json({ 
      error: 'Configuration error',
      message: `API key not configured for ${source}. Add it in Vercel Environment Variables.` 
    });
  }
  
  try {
    const targetUrl = `${baseUrl}${decodeURIComponent(url)}`;
    console.log('Target URL:', targetUrl);
    
    const headers = {};
    if (source === 'football-data') {
      headers['X-Auth-Token'] = apiKey;
    } else if (source === 'api-football') {
      headers['x-apisports-key'] = apiKey;
    }
    
    const response = await fetch(targetUrl, { headers });
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`API Error ${response.status}:`, errorBody);
      return res.status(response.status).json({ 
        error: `API returned ${response.status}`,
        message: errorBody.substring(0, 200)
      });
    }
    
    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(200).json(data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    return res.status(500).json({ error: 'Proxy request failed', message: error.message });
  }
}
