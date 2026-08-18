// 응답이 작성된 시점의 문진 버전을 찾아 준다.
//  확정(v1 → v2 → …) 때마다 직전 확정본이 form.history 에 통째로 보관되므로,
//  응답의 formVersion 으로 그 시점 내용을 되살려 조회·수정 화면에 그대로 쓸 수 있다.
import type { FormSchema } from '@/types/schema';

export interface VersionedForm {
  /** 화면에 쓸 문진(해당 버전 내용). 찾지 못하면 현재 문진. */
  form?: FormSchema;
  /** 현재 확정본이 아닌 과거 버전으로 표시 중인지 */
  isOld: boolean;
  /** 그 버전 내용이 보관돼 있지 않아 현재 버전으로 대체했는지 */
  missing: boolean;
  /** 현재 문진 버전 */
  currentVersion?: number;
}

/**
 * 응답이 작성된 버전의 문진을 돌려준다.
 *  - version 이 없거나 현재 버전과 같으면 현재 문진 그대로
 *  - 이력에 있으면 그 시점 스냅샷(이력 목록은 유지)
 *  - 이력에 없으면 현재 문진으로 대체하고 missing 표시
 */
export function formAtVersion(form: FormSchema | undefined, version?: number): VersionedForm {
  if (!form) return { form: undefined, isOld: false, missing: false };
  const current = form.version;
  if (version == null || version === current) {
    return { form, isOld: false, missing: false, currentVersion: current };
  }
  const rev = form.history?.find((h) => h.version === version);
  if (rev?.form) {
    return {
      // 스냅샷에는 이력이 없으므로(중첩 방지) 현재 이력을 붙여 화면에서 계속 쓸 수 있게 한다
      form: { ...rev.form, history: form.history },
      isOld: true,
      missing: false,
      currentVersion: current,
    };
  }
  return { form, isOld: false, missing: true, currentVersion: current };
}
