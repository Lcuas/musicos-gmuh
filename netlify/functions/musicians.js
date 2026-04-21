exports.handler = async () => {
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DATABASE_ID = process.env.DATABASE_ID || '6470132cae26424a963e735ca5e34f2a';

  try {
    let allResults = [];
    let cursor;

    do {
      const body = { page_size: 100 };
      if (cursor) body.start_cursor = cursor;

      const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      allResults = allResults.concat(data.results || []);
      cursor = data.has_more ? data.next_cursor : undefined;
    } while (cursor);

    const musicians = {};
    for (const page of allResults) {
      const nameArr = page.properties['Nome']?.title;
      const name = nameArr?.length > 0 ? nameArr[0].plain_text : null;
      const instruments = page.properties['Instrumento']?.multi_select?.map(i => i.name) || [];

      if (name) {
        if (!musicians[name]) musicians[name] = { name, instruments: [], pageIds: [] };
        musicians[name].instruments.push(...instruments);
        musicians[name].pageIds.push(page.id);
      }
    }

    for (const name in musicians) {
      musicians[name].instruments = [...new Set(musicians[name].instruments)];
    }

    const sorted = Object.values(musicians).sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR')
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sorted),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
