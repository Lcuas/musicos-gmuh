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
    const { pageIds, dates, period } = JSON.parse(event.body);

    if (!pageIds || !dates || dates.length === 0 || !period) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Dados incompletos.' }) };
    }

    const headers = {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    };

    // Monta as propriedades de Data 1 a Data 6
    const dateFields = ['Data 1', 'Data 2', 'Data 3', 'Data 4', 'Data 5', 'Data 6'];
    const dateProperties = {};

    dateFields.forEach((field, i) => {
      dateProperties[field] = dates[i]
        ? { date: { start: dates[i] } }
        : { date: null }; // limpa o campo se não tiver data
    });

    // Atualiza todos os registros do músico
    const updates = pageIds.map(pageId =>
      fetch(`https://api.notion.com/v1/pages/${pageId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          properties: {
            ...dateProperties,
            'Período': { select: { name: period } },
          }
        })
      })
    );

    const results = await Promise.all(updates);
    const failed = results.filter(r => !r.ok);
    if (failed.length > 0) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Erro ao atualizar registros.' }) };
    }

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
