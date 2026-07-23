// 이미지 파일 → 적당히 축소한 data URL (문진 스키마에 인라인 저장 — localStorage 용량 절약)
export async function fileToResizedDataUrl(
  file: File,
  maxDim = 1400,
  quality = 0.85,
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
    fr.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('이미지를 불러올 수 없습니다.'));
    im.src = dataUrl;
  });

  const longest = Math.max(img.width, img.height);
  const scale = longest > maxDim ? maxDim / longest : 1;
  // 충분히 작으면 원본 그대로(단, 큰 png는 아래에서 재인코딩)
  if (scale >= 1 && dataUrl.length < 500_000) return dataUrl;

  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  // 투명도가 필요한 도식은 png, 사진류는 jpeg 로
  const isPng = /^data:image\/png/i.test(dataUrl);
  return canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', quality);
}
