// PDF 배경 위에 실제 입력 컨트롤을 얹어 응답받는 렌더러 (환자용/미리보기)
// 라벨은 배경 PDF에 이미 있으므로, 각 필드는 최소한의 입력 컨트롤만 위치에 맞춰 표시.
import { Box, Checkbox, MenuItem, Paper, Select, TextField } from '@mui/material';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { FormSchema, Question } from '@/types/schema';

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

  if (q.type === 'boolean' || q.type === 'radio') {
    return (
      <Controller
        {...common}
        defaultValue={false}
        render={({ field }) => (
          <Checkbox
            checked={!!field.value}
            onChange={(e) => field.onChange(e.target.checked)}
            sx={{ p: 0, width: '100%', height: '100%' }}
          />
        )}
      />
    );
  }

  if (q.type === 'checkbox' || q.type === 'select') {
    const options = q.options ?? [];
    return (
      <Controller
        {...common}
        defaultValue=""
        render={({ field }) => (
          <Select {...field} size="small" fullWidth sx={{ height: '100%', fontSize: 12 }}>
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

  // text / textarea / number / date
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
          variant="standard"
          InputProps={{ sx: { fontSize: 12, height: '100%' } }}
          sx={{ height: '100%' }}
        />
      )}
    />
  );
}

export default function OverlayRenderer({ schema, control }: Props) {
  const pages = schema.pages ?? [];
  const questions = schema.sections.flatMap((s) => s.questions);

  return (
    <Box>
      {pages.map((page, pageIndex) => {
        const fields = questions.filter((q) => q.overlay && q.overlay.page === pageIndex);
        return (
          <Paper key={pageIndex} variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
            <Box sx={{ position: 'relative', width: '100%' }}>
              <img
                src={page.image}
                alt={`page-${pageIndex + 1}`}
                style={{ width: '100%', display: 'block' }}
              />
              {fields.map((q) => {
                const ov = q.overlay!;
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
                      alignItems: 'center',
                    }}
                  >
                    <FieldControl q={q} control={control} />
                  </Box>
                );
              })}
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
}
