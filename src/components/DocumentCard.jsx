import { Box, Typography } from '@mui/material';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { catStyleFor, DocLineIcon } from '../utils/docCategory';

/**
 * 文档列表行（统一设计原型）：整张列表首尾相连无空隙，每行左侧一条「栏目色条」，
 * 线性文档图标 + 栏目标签共用同一栏目色，整页克制高级。
 * 第二行标签：栏目 · 档位（免费/VIP）· 查看人数。整行可点 → 打开预览（onOpen）。
 * 颜色按文档所属栏目（subcategory）区分，未知栏目走确定性回落（见 utils/docCategory）。
 * 行的圆角/外边框/投影/分隔线由外层 App 的列表容器统一处理，这里只保留左侧色条。
 */
export default function DocumentCard({ doc, onOpen }) {
  const vipDoc = doc.requiredTier === 'vip';
  const cs = catStyleFor(doc.subcategory);

  return (
    <Box
      onClick={() => onOpen?.(doc)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.(doc); } }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1.25, sm: 1.5 },
        px: { xs: 1.5, sm: 1.75 },
        py: { xs: 1.4, sm: 1.6 },
        cursor: 'pointer',
        outline: 'none',
        borderLeft: `3px solid ${cs.color}`,
        transition: 'background-color .18s',
        '&:hover': { bgcolor: 'var(--bg-mute)' },
        '&:focus-visible': { bgcolor: 'var(--bg-mute)' },
      }}
    >
      {/* 线性文档图标，栏目色 */}
      <Box sx={{ width: 40, height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cs.color }}>
        <DocLineIcon badge={cs.badge} size={34} color={cs.color} />
      </Box>

      {/* 内容区：第一行标题，第二行标签 */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          noWrap
          sx={{ fontWeight: 600, color: 'var(--ink)', fontSize: { xs: '0.92rem', sm: '0.98rem' }, lineHeight: 1.35 }}
        >
          {doc.title}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.6, color: 'var(--ink-3)', fontSize: '0.76rem' }}>
          {doc.subcategory && (
            <Typography
              component="span"
              sx={{
                display: 'inline-block',
                px: 0.75, py: 0.15,
                borderRadius: 'var(--r-xs)',
                bgcolor: `${cs.color}1a`,
                color: cs.color,
                fontSize: '0.7rem',
                fontWeight: 700,
                lineHeight: 1.5,
                letterSpacing: '0.01em',
                whiteSpace: 'nowrap',
              }}
            >
              {doc.subcategory}
            </Typography>
          )}
          {/* 档位 */}
          {vipDoc ? (
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3, color: 'var(--gold-ink)' }}>
              <WorkspacePremiumIcon sx={{ fontSize: 13 }} />
              <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 700 }}>VIP</Typography>
            </Box>
          ) : (
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3, color: 'var(--success)' }}>
              <TaskAltRoundedIcon sx={{ fontSize: 13 }} />
              <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 700 }}>免费</Typography>
            </Box>
          )}
          {/* 查看人数 */}
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3 }}>
            <VisibilityOutlinedIcon sx={{ fontSize: 13 }} />
            <Typography component="span" sx={{ fontSize: 'inherit' }}>{doc.viewCount ?? 0}</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
