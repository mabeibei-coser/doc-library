import React, { useState } from 'react';
import { Card, Box, Typography, Button, Chip, CircularProgress } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import LockIcon from '@mui/icons-material/Lock';
import DescriptionIcon from '@mui/icons-material/Description';
import { downloadDocument, gotoCenterLogin } from '../utils/api';

/**
 * 文档卡片：标题/分类/说明 + free|vip 角标 + 下载按钮。
 * vip 档非会员点下载 → 后端 403 → 回调 onNeedVip 引导开通。
 */
export default function DocumentCard({ doc, isVip, onNeedVip }) {
  const [downloading, setDownloading] = useState(false);
  const [err, setErr] = useState(null);
  const vipDoc = doc.requiredTier === 'vip';

  const handleDownload = async () => {
    if (downloading) return;
    setErr(null);
    setDownloading(true);
    try {
      await downloadDocument(doc);
    } catch (e) {
      if (e.status === 401) { gotoCenterLogin(); return; }
      if (e.status === 403 || e.needVip) { onNeedVip?.(); return; }
      setErr(e.message || '下载失败');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: '#eef2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <DescriptionIcon sx={{ color: '#1e3a5f', fontSize: 22 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', lineHeight: 1.35 }}>
            {doc.title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
            {doc.category && (
              <Chip label={doc.category} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#f1f5f9', color: '#475569' }} />
            )}
            <Chip
              label={vipDoc ? 'VIP 专享' : '免费'}
              size="small"
              sx={{ height: 18, fontSize: '0.65rem', bgcolor: vipDoc ? '#1e3a5f' : '#ecfdf5', color: vipDoc ? '#fff' : '#065f46', fontWeight: 700 }}
            />
          </Box>
        </Box>
      </Box>

      {doc.description && (
        <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.55, flex: 1 }}>
          {doc.description}
        </Typography>
      )}

      {err && <Typography variant="caption" sx={{ color: '#dc2626' }}>{err}</Typography>}

      <Button
        variant={vipDoc && !isVip ? 'outlined' : 'contained'}
        size="small"
        fullWidth
        disabled={downloading || !doc.hasAttachment}
        startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : (vipDoc && !isVip ? <LockIcon /> : <DownloadIcon />)}
        onClick={handleDownload}
        sx={{
          mt: 'auto',
          ...(vipDoc && !isVip
            ? { color: '#1e3a5f', borderColor: '#cbd5e1' }
            : { bgcolor: '#1e3a5f', '&:hover': { bgcolor: '#2c5282' } }),
        }}
      >
        {!doc.hasAttachment ? '暂无附件' : downloading ? '下载中...' : (vipDoc && !isVip ? '开通 VIP 下载' : '下载')}
      </Button>
    </Card>
  );
}
