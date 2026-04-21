const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.DATABASE_ID || '6470132cae26424a963e735ca5e34f2a';

const WHATSAPP_LINKS = {
  'Manhã': process.env.WHATSAPP_MANHA || '',
  'Tarde': process.env.WHATSAPP_TARDE || '',
  'Noite': process.env.WHATSAPP_NOITE || '',
};

function notionHeaders() {
  return {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28',
  };
}

// Busca todos os músicos do Notion
app.get('/api/musicians', async (req, res) => {
  try {
    let allResults = [];
    let cursor = undefined;

    do {
      const body = { page_size: 100 };
      if (cursor) body.start_cursor = cursor;

      const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
        method: 'POST',
        headers: notionHeaders(),
        body: JSON.stringify(body),
      });
      const data = await response.json();
      allResults = allResults.concat(data.results || []);
      cursor = data.has_more ? data.next_cursor : undefined;
    } while (cursor);

    // Agrupa por nome, junta instrumentos e pageIds
    const musicians = {};
    for (const page of allResults) {
      const nameArr = page.properties['Nome']?.title;
      const name = nameArr && nameArr.length > 0 ? nameArr[0].plain_text : null;
      const instruments = page.properties['Instrumento']?.multi_select?.map(i => i.name) || [];
      const pageId = page.id;

      if (name) {
        if (!musicians[name]) {
          musicians[name] = { name, instruments: [], pageIds: [] };
        }
        musicians[name].instruments.push(...instruments);
        musicians[name].pageIds.push(pageId);
      }
    }

    // Remove duplicatas de instrumentos e ordena
    for (const name in musicians) {
      musicians[name].instruments = [...new Set(musicians[name].instruments)];
    }

    const sorted = Object.values(musicians).sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR')
    );

    res.json(sorted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar músicos no Notion.' });
  }
});

// Atualiza disponibilidade do músico
app.post('/api/update', async (req, res) => {
  try {
    const { pageIds, date, period } = req.body;

    if (!pageIds || !date || !period) {
      return res.status(400).json({ error: 'Dados incompletos.' });
    }

    const updates = pageIds.map(pageId =>
      fetch(`https://api.notion.com/v1/pages/${pageId}`, {
        method: 'PATCH',
        headers: notionHeaders(),
        body: JSON.stringify({
          properties: {
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

    const results = await Promise.all(updates);
    const failed = results.filter(r => !r.ok);
    if (failed.length > 0) {
      return res.status(500).json({ error: 'Erro ao atualizar alguns registros no Notion.' });
    }

    const whatsappLink = WHATSAPP_LINKS[period] || '';
    res.json({ success: true, whatsappLink });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor rodando na porta ${PORT}`));
