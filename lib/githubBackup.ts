// lib/githubBackup.ts
// Funções para salvar e restaurar backups JSON usando a GitHub API
// Não acoplado à UI, pode ser usado em qualquer parte do app

export interface GithubBackupConfig {
  owner: string; // Ex: 'usuario'
  repo: string; // Ex: 'meu-repo'
  path: string; // Ex: 'backups/backup.json'
  token: string; // Personal Access Token ou OAuth
  branch?: string; // Ex: 'main' (opcional, default: main)
}

// Salva (cria/atualiza) um arquivo JSON no repositório
export async function saveBackupToGithub(config: GithubBackupConfig, data: any, commitMessage = 'Backup automático do app') {
  const { owner, repo, path, token, branch = 'main' } = config;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));

  // Verifica se o arquivo já existe para obter o SHA
  let sha: string | undefined;
  try {
    const res = await fetch(url + `?ref=${branch}`, {
      headers: { Authorization: `token ${token}` }
    });
    if (res.ok) {
      const json = await res.json();
      sha = json.sha;
    }
  } catch {}

  const body = {
    message: commitMessage,
    content,
    branch,
    ...(sha ? { sha } : {})
  };

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(`Erro ao salvar backup no GitHub: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

// Restaura (baixa) o arquivo JSON do repositório
export async function loadBackupFromGithub(config: GithubBackupConfig): Promise<any> {
  const { owner, repo, path, token, branch = 'main' } = config;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3.raw'
    }
  });
  if (!res.ok) {
    throw new Error(`Erro ao carregar backup do GitHub: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}
