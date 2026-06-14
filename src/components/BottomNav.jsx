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
        left: '50%',
        right: 'auto',
        bottom: 'max(18px, env(safe-area-inset-bottom))',
        transform: 'translateX(-50%)',
        width: 'min(346px, calc(100vw - 44px))',
        maxWidth: 346,
        height: 56,
        minHeight: 56,
        zIndex: 1200,
        border: '1px solid var(--line)',
        borderRadius: '18px',
        bgcolor: 'rgba(255,255,255,0.90)',
        boxShadow: '0 14px 32px rgba(15,118,110,0.12), 0 2px 8px rgba(15,20,25,0.06)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        overflow: 'hidden',
      }}
    >
      <BottomNavigation
        showLabels
        value={0}
        sx={{
          width: '100%',
          height: 56,
          bgcolor: 'transparent',
          '& .MuiBottomNavigationAction-root': {
            position: 'relative',
            color: 'var(--ink-3)',
            minWidth: 0,
            height: 52,
            padding: '6px 0 7px',
            fontSize: '0.68rem',
          },
          '& .MuiBottomNavigationAction-label': { fontSize: '0.68rem' },
          '& .MuiBottomNavigationAction-root svg': { fontSize: 20 },
          '& .Mui-selected': { color: 'var(--accent) !important' },
          '& .Mui-selected::after': {
            content: '""',
            position: 'absolute',
            left: '50%',
            bottom: 3,
            width: 22,
            height: 3,
            borderRadius: 999,
            bgcolor: 'var(--accent)',
            transform: 'translateX(-50%)',
          },
        }}
      >
        <BottomNavigationAction label="首页" icon={<HomeRoundedIcon />} onClick={onHome} />
        <BottomNavigationAction label="记录" icon={<HistoryRoundedIcon />} onClick={onHistory} />
        <BottomNavigationAction label="我的" icon={<PersonRoundedIcon />} onClick={onMine} />
      </BottomNavigation>
    </Paper>
  )
}
