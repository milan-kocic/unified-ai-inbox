const axios = require('axios');

const PROVIDER_DEFAULTS = {
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    models: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5'],
    headers: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }),
    buildBody: (model, systemPrompt, userMessage, history, maxTokens) => ({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [...history.map(h => ({ role: h.role, content: h.content })), { role: 'user', content: userMessage }]
    }),
    parse: (res) => ({ text: res.data.content?.[0]?.text || '', tokensUsed: res.data.usage?.input_tokens + res.data.usage?.output_tokens || 0 })
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
    headers: (key) => ({ authorization: `Bearer ${key}`, 'content-type': 'application/json' }),
    buildBody: (model, systemPrompt, userMessage, history, maxTokens) => ({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: systemPrompt }, ...history.map(h => ({ role: h.role, content: h.content })), { role: 'user', content: userMessage }]
    }),
    parse: (res) => ({ text: res.data.choices?.[0]?.message?.content || '', tokensUsed: res.data.usage?.total_tokens || 0 })
  },
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'],
    headers: () => ({ 'content-type': 'application/json' }),
    buildBody: (model, systemPrompt, userMessage, history, maxTokens) => ({
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userMessage }] }
      ],
      generationConfig: { maxOutputTokens: maxTokens }
    }),
    parse: (res) => ({ text: res.data.candidates?.[0]?.content?.parts?.[0]?.text || '', tokensUsed: 0 })
  },
  ollama: {
    url: 'http://localhost:11434/api/chat',
    models: ['llama3.2', 'mistral', 'phi3', 'gemma2'],
    headers: () => ({ 'content-type': 'application/json' }),
    buildBody: (model, systemPrompt, userMessage, history, maxTokens) => ({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...history.map(h => ({ role: h.role, content: h.content })), { role: 'user', content: userMessage }],
      stream: false,
      options: { num_predict: maxTokens }
    }),
    parse: (res) => ({ text: res.data.message?.content || '', tokensUsed: 0 })
  }
};

async function callAI({ provider, apiKey, model, systemPrompt, userMessage, conversationHistory = [], maxTokens = 500, customConfig = {} }) {
  try {
    const defaults = PROVIDER_DEFAULTS[provider];
    if (!defaults && provider !== 'custom') {
      return { success: false, error: `Nepoznat provajder: ${provider}` };
    }

    let url, headers, body;

    if (provider === 'custom') {
      url = customConfig.url;
      headers = { 'content-type': 'application/json', ...(customConfig.headers ? JSON.parse(customConfig.headers) : {}) };
      if (apiKey) headers.authorization = `Bearer ${apiKey}`;
      const format = customConfig.format || 'openai';
      if (format === 'openai') {
        body = {
          model,
          max_tokens: maxTokens,
          messages: [{ role: 'system', content: systemPrompt }, ...conversationHistory.map(h => ({ role: h.role, content: h.content })), { role: 'user', content: userMessage }]
        };
      } else if (format === 'anthropic') {
        body = {
          model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [...conversationHistory.map(h => ({ role: h.role, content: h.content })), { role: 'user', content: userMessage }]
        };
      } else {
        return { success: false, error: 'Custom format nije implementiran' };
      }
    } else {
      url = defaults.url;
      if (provider === 'gemini') {
        url = `${url}/${model}:generateContent?key=${apiKey}`;
      }
      headers = defaults.headers(apiKey);
      body = defaults.buildBody(model, systemPrompt, userMessage, conversationHistory, maxTokens);
    }

    const res = await axios.post(url, body, { headers, timeout: 60000 });

    let text, tokensUsed;
    if (provider === 'custom') {
      const format = customConfig.format || 'openai';
      if (format === 'openai') {
        text = res.data.choices?.[0]?.message?.content || '';
        tokensUsed = res.data.usage?.total_tokens || 0;
      } else {
        text = res.data.content?.[0]?.text || '';
        tokensUsed = res.data.usage?.input_tokens + res.data.usage?.output_tokens || 0;
      }
    } else {
      const parsed = defaults.parse(res);
      text = parsed.text;
      tokensUsed = parsed.tokensUsed;
    }

    return { success: true, text, tokensUsed };
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message || 'Nepoznata greška';
    return { success: false, error: msg, tokensUsed: 0 };
  }
}

function getModelsForProvider(provider) {
  return PROVIDER_DEFAULTS[provider]?.models || [];
}

module.exports = { callAI, getModelsForProvider };
