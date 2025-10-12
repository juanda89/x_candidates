export default function HomePage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>X Candidates</h1>
      <p>Selecciona una vista para empezar:</p>
      <ul>
        <li><a href="/perfil">Perfil</a></li>
        <li><a href="/analisis">Análisis de Tweets</a></li>
        <li><a href="/comparar">Comparativo de Cuentas</a></li>
      </ul>
    </main>
  );
}

