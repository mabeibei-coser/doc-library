import { Paper, BottomNavigation, BottomNavigationAction } from '@mui/material'
import HomeRoundedIcon from '@mui/icons-material/HomeRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'

// 全站悬浮底部导航：首页（回本应用首页）+ 记录（去会员中心识别历史）+ 我的（去会员中心个人页）
// 永远固定在视口底部，三个视图态都显示。本应用即「首页」，故首页常驻选中。
export default function BottomNav({ onHome, onHistory, onMine }) {
  return (
    <Paper
      elevation={0}
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1200,
        borderTop: '1px solid var(--line)',
        bgcolor: 'background.paper',
        boxShadow: 'var(--shadow-lg)',
        pb: 'env(safe-area-inset-bottom)', // 适配 iPhone 底部安全区
      }}
    >
      <BottomNavigation
        showLabels
        value={0}
        sx={{
          maxWidth: 480,
          mx: 'auto',
          height: 60,
          bgcolor: 'transparent',
          '& .MuiBottomNavigationAction-root': { color: 'var(--ink-3)', minWidth: 0 },
          '& .Mui-selected': { color: 'var(--accent) !important' },
        }}
      >
        <BottomNavigationAction label="首页" icon={<HomeRoundedIcon />} onClick={onHome} />
        <BottomNavigationAction label="记录" icon={<HistoryRoundedIcon />} onClick={onHistory} />
        <BottomNavigationAction label="我的" icon={<PersonRoundedIcon />} onClick={onMine} />
      </BottomNavigation>
    </Paper>
  )
}
