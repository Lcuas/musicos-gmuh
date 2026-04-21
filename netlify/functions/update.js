exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DATABASE_ID = process.env.DATABASE_ID || '6470132cae26424a963e735ca5e34f2a';
  const WHATSAPP_LINKS = {
    'Manhã': process.env.WHATSAPP_MANHA || '',
    'Tarde': process.env.WHATSAPP_TARDE || '',
    'Noite': process.env.WHATSAPP_NOITE || '',
  };

  try {
    const { name, instruments, dates, period } = JSON.parse(event.body);

    if (!name || !instruments || !dates || dates.length === 0 || !period) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Dados incompletos.' }) };
    }

    const headers = {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    };

    // Cria uma nova linha no Notion para cada data selecionada
    const creates = dates.map(date =>
      fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          parent: { database_id: DATABASE_ID },
          properties: {
            'Nome': {
              title: [{ text: { content: name } }]
            },
            'Instrumento': {
              multi_select: instruments.map(i => ({ name: i }))
            },
            'Data de Disponibilidade': {
              date: { start: date }
            },
            'Período': {
              select: { name: period }
            }
          }
        })
      })
    );

    await Promise.all(creates);

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
