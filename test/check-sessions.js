const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkGameSessions() {
  const client = await pool.connect();
  try {
    // Check recent sessions with correct column names
    const sessions = await client.query(`
      SELECT
        gs.*,
        u.username
      FROM game_sessions gs
      LEFT JOIN users u ON gs.user_id = u.id
      ORDER BY gs.started_at DESC
      LIMIT 20
    `);

    console.log(`Found ${sessions.rows.length} game sessions:`);
    console.log('=====================================');
    sessions.rows.forEach(session => {
      console.log(`Session ${session.id}:`);
      console.log(`  User: ${session.username || 'Unknown'} (ID: ${session.user_id})`);
      console.log(`  Player Name: ${session.player_name}`);
      console.log(`  Arena: ${session.arena_id}`);
      console.log(`  Started: ${session.started_at ? new Date(parseInt(session.started_at)) : 'N/A'}`);
      console.log(`  Ended: ${session.ended_at ? new Date(parseInt(session.ended_at)) : 'STILL ACTIVE'}`);
      console.log(`  Duration: ${session.duration ? session.duration + 's' : 'N/A'}`);
      console.log('---');
    });

    // Check for any active sessions (ended_at is NULL)
    const active = await client.query(`
      SELECT
        gs.*,
        u.username,
        u.privy_id
      FROM game_sessions gs
      LEFT JOIN users u ON gs.user_id = u.id
      WHERE gs.ended_at IS NULL
    `);

    console.log(`\nActive sessions (not ended): ${active.rows.length}`);
    if (active.rows.length > 0) {
      console.log('⚠️  FOUND ACTIVE SESSIONS - This might be blocking new connections!');
      active.rows.forEach(session => {
        console.log(`  - Session ${session.id}: User ${session.username} (${session.privy_id}) started at ${new Date(parseInt(session.started_at))}`);
      });
    }

  } finally {
    client.release();
    await pool.end();
  }
}

checkGameSessions().catch(console.error);