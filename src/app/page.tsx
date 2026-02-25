export default function Home() {
  return (
    <main style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'system-ui',background:'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',color:'white'}}>
      <h1 style={{fontSize:'3rem',marginBottom:'1rem'}}>WeatherPulse</h1>
      <p style={{fontSize:'1.2rem',opacity:0.9}}>Real-time weather dashboard with animated icons and 5-day forecast</p>
      <p style={{marginTop:'2rem',opacity:0.7}}>API endpoints available at /api/health and /api/tasks</p>
    </main>
  )
}
