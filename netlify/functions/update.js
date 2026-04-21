exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const WHATSAPP_LINKS = {
    'Manhã': process.env.WHATSAPP_MANHA || '',
    'Tarde': process.env.WHATSAPP_TARDE || '',
    'Noite': process.env.WHATSAPP_NOITE || '',
  };

  try {
    const { pageIds, date, period } = JSON.parse(event.body);

    if (!pageIds || !date || !period) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Dados incompletos.' }) };
    }

    const headers = {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    };

    const updates = pageIds.map(pageId =>
      fetch(`https://api.notion.com/v1/pages/${pageId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          properties: {
            'Data de Disponibilidade': { date: { start: date } },
            'Período': { select: { name: period } },
          }
        })
      })
    );

    await Promise.all(updates);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, whatsappLink: WHATSAPP_LINKS[period] || '' }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
