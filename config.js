/* Configuração da Mesa de Licitação (versão web).
   Copie do Supabase: Project Settings › API (ou "Connect"):
   - url: o "Project URL" (ex.: https://abcdxyz.supabase.co)
   - anonKey: a chave "anon public" (ou "publishable"). Ela é pública por natureza e pode ficar aqui.
   NUNCA coloque aqui a chave "service_role" / "secret" nem a chave da Anthropic. */
window.MESA_CONFIG = {
  url: "https://robnkazwinsyqfamzwga.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvYm5rYXp3aW5zeXFmYW16d2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNTk5NzMsImV4cCI6MjEwNzYzNTk3M30.QYPvBcYHHJJ6mNVlpLsdNhAUk8lzw_M8pRwEHxgg_5k",
  orgao: "Prefeitura Municipal de Itapuí",
  // e-mails de quem pode mexer nas Configurações (modelos, papel timbrado, base legal).
  // Deixe a lista vazia para, no teste, todos poderem.
  admins: [],
  // mude para true depois de criar a função "claude" no Supabase (opcional, tem custo na Anthropic)
  claude: true
};
