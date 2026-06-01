import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider, createTheme, CssBaseline, GlobalStyles } from '@mui/material'
import App from './App.jsx'

// 清爽浅色 · 亲和友好：明亮中性基底 + 单一亲和蓝强调，免费=柔绿 / VIP=柔金两套语义色。
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2563eb', dark: '#1d4ed8', light: '#eff6ff', contrastText: '#fff' },
    success: { main: '#10b981', dark: '#047857', light: '#ecfdf5' },
    warning: { main: '#f59e0b', dark: '#b45309', light: '#fffbeb' },
    background: { default: '#f6f8fc', paper: '#ffffff' },
    text: { primary: '#0f172a', secondary: '#475569' },
    divider: 'rgba(226, 232, 240, 0.9)',
  },
  shape: { borderRadius: 12 },
  typography: {
    // 中文为主：保留系统中文字体栈（去掉 Inter），靠字重/字距做质感，不引外部 web font。
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'HarmonyOS Sans SC', 'Microsoft YaHei', 'Segoe UI', system-ui, 'Noto Sans SC', sans-serif",
    h4: { fontWeight: 800, letterSpacing: '-0.02em' },
    h6: { fontWeight: 700 },
    button: { fontWeight: 700 },
  },
  components: {
    MuiButton: {
      styleOverrides: { root: { borderRadius: 12, textTransform: 'none', fontWeight: 700, boxShadow: 'none' } },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 999, fontWeight: 600 } } },
  },
})

const globalStyles = (
  <GlobalStyles
    styles={{
      // 入场级联淡入上移（纯 CSS，只动 transform/opacity）
      '@keyframes docFadeUp': {
        from: { opacity: 0, transform: 'translateY(14px)' },
        to: { opacity: 1, transform: 'translateY(0)' },
      },
      // 骨架屏流光
      '@keyframes docShimmer': {
        '100%': { transform: 'translateX(100%)' },
      },
      // 尊重系统「减少动态效果」无障碍设置
      '@media (prefers-reduced-motion: reduce)': {
        '*': { animationDuration: '0.001ms !important', animationIterationCount: '1 !important', transition: 'none !important' },
      },
    }}
  />
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {globalStyles}
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
