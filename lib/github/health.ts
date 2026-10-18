export type SyncHealth={state:"syncing"|"preparing"|"failed"|"stale"|"ready";syncedAt:string|null;attemptedAt:string|null;detail:string};
export function syncHealth(row:{sync_status:string;synced_at:string|null;last_attempt_at?:string|null;sync_started_at?:string|null;sync_error_code?:string|null},now=Date.now()):SyncHealth{
 const active=!!row.sync_started_at&&now-Date.parse(row.sync_started_at)<120000;
 const state=active?"syncing":row.sync_status==="unavailable"?"failed":row.sync_status==="pending"?"preparing":!row.synced_at||now-Date.parse(row.synced_at)>30*60000?"stale":"ready";
 const code=row.sync_error_code;
 const detail=state==="failed"?(code==="github-401"||code==="private-key-format"?"The GitHub App authentication needs attention from the project owner.":code==="github-403"||code==="github-422"?"GitHub access or request limits need attention. Check installation permissions and retry.":code==="github-404"?"GitHub could not access the repository. Check the installation’s repository selection.":code==="github-429"?"GitHub is limiting requests. Wait before retrying.":"The last refresh failed. Previously stored activity may be out of date."):state==="preparing"?"GitHub is preparing the contribution graph. A scheduled retry or refresh can finish it.":state==="stale"?"Activity has not refreshed within 30 minutes. It may be out of date.":state==="syncing"?"A repository refresh is in progress.":"Latest stored repository activity is available.";
 return {state,syncedAt:row.synced_at,attemptedAt:row.last_attempt_at||null,detail};
}
