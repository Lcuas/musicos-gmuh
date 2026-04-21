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
    // entries = [{ date, period }, ...] — até 6 itens
    const { pageIds, entries } = JSON.parse(event.body);

    if (!pageIds || !entries || entries.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Dados incompletos.' }) };
    }

    const headers = {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    };

    // Monta campo único "Disponibilidades" com todas as entradas (sem limite)
    const lines = entries.map(e => {
      const [y, m, d] = e.date.split('-');
      return `${d}/${m}/${y} · ${e.period}`;
    });
    const properties = {
      'Disponibilidades': {
        rich_text: [{ type: 'text', text: { content: lines.join('\n') } }]
      }
    };

    // Atualiza todos os registros do músico
    const updates = pageIds.map(pageId =>
      fetch(`https://api.notion.com/v1/pages/${pageId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ properties })
      })
    );

    const results = await Promise.all(updates);
    const failed = results.filter(r => !r.ok);
    if (failed.length > 0) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Erro ao atualizar registros.' }) };
    }

    // Link do WhatsApp do primeiro período (referência)
    const whatsappLink = WHATSAPP_LINKS[entries[0]?.period] || '';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, whatsappLink }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
