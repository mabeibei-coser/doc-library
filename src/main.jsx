import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider, createTheme, CssBaseline, GlobalStyles } from '@mui/material'
import App from './App.jsx'
import './styles/index.css'

// MUI theme：与 ASG100 会员中心同一套设计语言 v2（暖白纸感 + 深青绿 + 墨黑 + VIP 古金）。
// 免费=克制绿 / VIP=古金两套语义色，颜色与 src/styles/index.css 的 CSS var 保持同步。
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0f766e', dark: '#0d6660', light: '#ccfbf1', contrastText: '#ffffff' },
    secondary: { main: '#525866' },
    success: { main: '#2f8559', dark: '#1f6344', light: '#e7f3ec', contrastText: '#ffffff' },
    warning: { main: '#b08a3e', dark: '#8a6c2f', light: '#fdf6e4', contrastText: '#ffffff' },
    error: { main: '#b8472d', light: '#fce8e1', contrastText: '#ffffff' },
    background: { default: '#fafaf7', paper: '#ffffff' },
    text: { primary: '#0f1419', secondary: '#525866', disabled: '#9098a5' },
    divider: '#e6e6e1',
  },
  typography: {
    // 统一字体走 CSS 变量 --font-base（典雅宋体），与 index.css / 三端保持同源、可一处切换
    fontFamily: 'var(--font-base)',
    h4: { fontWeight: 700, letterSpacing: '-0.025em' },
    h5: { fontWeight: 650, letterSpacing: '-0.018em' },
    h6: { fontWeight: 600, letterSpacing: '-0.012em' },
    button: { fontWeight: 600 },
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: { root: { borderRadius: 8 } },
    },
    MuiButton: {
      styleOverrides: { root: { borderRadius: 8, textTransform: 'none', fontWeight: 600, boxShadow: 'none' } },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 6 } } },
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
