// PDF 배경 위에 실제 입력 컨트롤을 얹어 응답받는 렌더러 (환자용/미리보기)
// 라벨은 배경 PDF에 이미 있으므로, 각 필드는 최소한의 입력 컨트롤만 위치에 맞춰 표시.
import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Checkbox,
  Chip,
  FormControlLabel,
  FormGroup,
  IconButton,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { FormPage, FormSchema, Question } from '@/types/schema';
import { useElementSize } from '@/hooks/useElementSize';

interface Props {
  schema: FormSchema;
  control: Control<Record<string, unknown>>;
  errors: FieldErrors<Record<string, unknown>>;
  /** true면 전체화면 미리보기용 — 여러 페이지를 한 화면에 나란히 + Ctrl+휠 확대/축소 */
  fitPreview?: boolean;
}

function FieldControl({ q, control }: { q: Question; control: Control<Record<string, unknown>> }) {
  const common = {
    name: q.id,
    control,
  };

  const fontSize = q.fontSize ?? 13;
  const color = q.color;
  const labelSx = {
    m: 0,
    mr: 1,
    '& .MuiFormControlLabel-label': { fontSize, color: color ?? undefined },
  };

  if (q.type === 'boolean') {
    // 예/아니오 단일 체크박스: 박스를 꽉 채우고 클릭 영역을 넓게
    return (
      <Controller
        {...common}
        defaultValue={false}
        render={({ field }) => (
          <Box
            onClick={() => field.onChange(!field.value)}
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Checkbox
              checked={!!field.value}
              onChange={(e) => field.onChange(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              size="small"
              sx={{ p: 0, color: 'primary.main', '& .MuiSvgIcon-root': { fontSize: 'min(4vw, 26px)' } }}
            />
          </Box>
        )}
      />
    );
  }

  if (q.type === 'radio') {
    // 단일 선택: 선택지 수만큼 라디오
    const options = q.options ?? [];
    return (
      <Controller
        {...common}
        defaultValue=""
        render={({ field }) => (
          <RadioGroup
            row
            value={field.value ?? ''}
            onChange={(e) => field.onChange(e.target.value)}
            sx={{ gap: 0.5 }}
          >
            {options.map((o) => (
              <FormControlLabel
                key={o.id}
                value={o.value}
                control={<Radio size="small" sx={{ p: 0.25 }} />}
                label={o.label}
                sx={labelSx}
              />
            ))}
          </RadioGroup>
        )}
      />
    );
  }

  if (q.type === 'checkbox') {
    // 복수 선택: 선택지 수만큼 체크박스(값은 배열)
    const options = q.options ?? [];
    return (
      <Controller
        {...common}
        defaultValue={[]}
        render={({ field }) => {
          const val: string[] = Array.isArray(field.value) ? (field.value as string[]) : [];
          return (
            <FormGroup row sx={{ gap: 0.5 }}>
              {options.map((o) => (
                <FormControlLabel
                  key={o.id}
                  control={
                    <Checkbox
                      size="small"
                      sx={{ p: 0.25 }}
                      checked={val.includes(o.value)}
                      onChange={(e) =>
                        field.onChange(
                          e.target.checked
                            ? [...val, o.value]
                            : val.filter((v) => v !== o.value),
                        )
                      }
                    />
                  }
                  label={o.label}
                  sx={labelSx}
                />
              ))}
            </FormGroup>
          );
        }}
      />
    );
  }

  if (q.type === 'select') {
    const options = q.options ?? [];
    return (
      <Controller
        {...common}
        defaultValue=""
        render={({ field }) => (
          <Select
            {...field}
            size="small"
            fullWidth
            sx={{ height: '100%', fontSize, color: color ?? undefined, bgcolor: 'rgba(255,255,255,0.9)' }}
          >
            {options.map((o) => (
              <MenuItem key={o.id} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        )}
      />
    );
  }

  if (q.type === 'info' || q.type === 'signature') {
    return null;
  }

  // text / textarea / number / date → 채울 수 있는 흰 박스로 표시
  const type = q.type === 'number' ? 'number' : q.type === 'date' ? 'date' : 'text';
  return (
    <Controller
      {...common}
      defaultValue=""
      render={({ field }) => (
        <TextField
          {...field}
          type={type}
          size="small"
          fullWidth
          multiline={q.type === 'textarea'}
          placeholder="입력"
          sx={{
            height: '100%',
            '& .MuiOutlinedInput-root': {
              height: '100%',
              bgcolor: 'rgba(255,255,255,0.92)',
              fontSize,
              color: color ?? undefined,
            },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.light' },
          }}
        />
      )}
    />
  );
}

/**
 * 한 페이지를 "디자인 크기(page.width×page.height) 그대로" 그린 뒤,
 * 컨테이너 폭에 맞춰 통째로 transform:scale — 위치·글자·컨트롤이 같은 비율로
 * 축소되어 어떤 화면 폭에서도 편집기와 동일하게 보인다(모바일 겹침 방지).
 */
function PageRender({
  page,
  pageIndex,
  fields,
  control,
  showLabel,
}: {
  page: FormPage;
  pageIndex: number;
  fields: Question[];
  control: Control<Record<string, unknown>>;
  showLabel: boolean;
}) {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const scale = size.width > 0 ? size.width / page.width : 1;

  return (
    <Paper variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
      <Box ref={ref} sx={{ position: 'relative', width: '100%', height: page.height * scale }}>
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: page.width,
            height: page.height,
            transformOrigin: 'top left',
            transform: `scale(${scale})`,
          }}
        >
          <img
            src={page.image}
            alt={`page-${pageIndex + 1}`}
            style={{ width: page.width, height: page.height, display: 'block' }}
          />
          {fields.map((q) => {
            const ov = q.overlay!;
            const isCheck = q.type === 'boolean';
            const withLabel = showLabel && q.type !== 'info';
            const labelSize = q.fontSize ?? 13;
            const labelEl = withLabel ? (
              <Box
                component="span"
                sx={{
                  fontSize: labelSize,
                  fontWeight: isCheck ? 400 : 600,
                  color: q.color ?? 'text.primary',
                  lineHeight: 1.15,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {q.label}
              </Box>
            ) : null;
            return (
              <Box
                key={q.id}
                sx={{
                  position: 'absolute',
                  left: `${ov.xPct}%`,
                  top: `${ov.yPct}%`,
                  width: `${ov.wPct}%`,
                  height: `${ov.hPct}%`,
                  display: 'flex',
                  flexDirection: isCheck ? 'row' : 'column',
                  alignItems: isCheck ? 'center' : 'stretch',
                  gap: withLabel ? 0.5 : 0,
                }}
              >
                {isCheck ? (
                  <>
                    <Box sx={{ width: 22, height: '100%', maxHeight: 26, flexShrink: 0 }}>
                      <FieldControl q={q} control={control} />
                    </Box>
                    {labelEl}
                  </>
                ) : (
                  <>
                    {labelEl}
                    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center' }}>
                      <FieldControl q={q} control={control} />
                    </Box>
                  </>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Paper>
  );
}

const ZOOM_MIN = 0.4;
const ZOOM_MAX = 3;
const BASE_COLS = 3; // 확대 100%일 때 한 줄에 보이는 페이지 수(≈3페이지 동시 표시)
const GAP = 16;

/** 전체화면 미리보기: 페이지를 나란히 배치하고 Ctrl+휠로 확대/축소 */
function FitOverlay({
  pages,
  questions,
  control,
  showLabel,
}: {
  pages: FormPage[];
  questions: Question[];
  control: Control<Record<string, unknown>>;
  showLabel: boolean;
}) {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const [zoom, setZoom] = useState(1);

  const baseColWidth = size.width > 0 ? (size.width - GAP * (BASE_COLS - 1)) / BASE_COLS : 0;
  // 확대해도 한 페이지가 컨테이너 폭을 넘지 않도록 제한
  const itemWidth = Math.min(baseColWidth * zoom, size.width || baseColWidth);

  // Ctrl(또는 ⌘)+휠 확대/축소 — passive:false 로 등록해야 preventDefault 가능
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((z) => {
        const next = z * (e.deltaY < 0 ? 1.1 : 1 / 1.1);
        return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [ref]);

  const bump = useCallback(
    (dir: number) =>
      setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z * (dir > 0 ? 1.15 : 1 / 1.15)))),
    [],
  );

  return (
    <Box>
      <Stack
        direction="row"
        spacing={0.5}
        alignItems="center"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          py: 0.75,
          mb: 1,
          bgcolor: 'background.default',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Tooltip title="축소">
          <IconButton size="small" onClick={() => bump(-1)}>
            <ZoomOutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Chip
          label={`${Math.round(zoom * 100)}%`}
          size="small"
          variant="outlined"
          onClick={() => setZoom(1)}
          sx={{ minWidth: 60, fontVariantNumeric: 'tabular-nums', cursor: 'pointer' }}
        />
        <Tooltip title="확대">
          <IconButton size="small" onClick={() => bump(1)}>
            <ZoomInIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="기본 배율(3페이지 보기)">
          <IconButton size="small" onClick={() => setZoom(1)}>
            <RestartAltIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Box sx={{ flex: 1 }} />
        <Box component="span" sx={{ fontSize: 12, color: 'text.secondary', pr: 1 }}>
          Ctrl + 마우스 휠로 확대/축소
        </Box>
      </Stack>

      <Box
        ref={ref}
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'flex-start',
          gap: `${GAP}px`,
        }}
      >
        {pages.map((page, pageIndex) => (
          <Box key={pageIndex} sx={{ width: itemWidth > 0 ? itemWidth : `${100 / BASE_COLS}%` }}>
            <PageRender
              page={page}
              pageIndex={pageIndex}
              fields={questions.filter((q) => q.overlay && q.overlay.page === pageIndex)}
              control={control}
              showLabel={showLabel}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function OverlayRenderer({ schema, control, fitPreview }: Props) {
  const pages = schema.pages ?? [];
  const questions = schema.sections.flatMap((s) => s.questions);
  const showLabel = !!schema.canvas; // 빈 캔버스 문진은 라벨을 함께 표시

  if (fitPreview) {
    return (
      <FitOverlay pages={pages} questions={questions} control={control} showLabel={showLabel} />
    );
  }

  return (
    <Box>
      {pages.map((page, pageIndex) => (
        <PageRender
          key={pageIndex}
          page={page}
          pageIndex={pageIndex}
          fields={questions.filter((q) => q.overlay && q.overlay.page === pageIndex)}
          control={control}
          showLabel={showLabel}
        />
      ))}
    </Box>
  );
}
