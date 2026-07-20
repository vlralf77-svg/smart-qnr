// PDF 배경 위에 실제 입력 컨트롤을 얹어 응답받는 렌더러 (환자용/미리보기)
// 라벨은 배경 PDF에 이미 있으므로, 각 필드는 최소한의 입력 컨트롤만 위치에 맞춰 표시.
import {
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  TextField,
} from '@mui/material';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { FormPage, FormSchema, Question } from '@/types/schema';
import { useElementSize } from '@/hooks/useElementSize';

interface Props {
  schema: FormSchema;
  control: Control<Record<string, unknown>>;
  errors: FieldErrors<Record<string, unknown>>;
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

export default function OverlayRenderer({ schema, control }: Props) {
  const pages = schema.pages ?? [];
  const questions = schema.sections.flatMap((s) => s.questions);
  const showLabel = !!schema.canvas; // 빈 캔버스 문진은 라벨을 함께 표시

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
