window.IFMVariantRoute=(days,saved)=>`
<style>
.route{margin:0 16px;border:1px solid var(--line);background:var(--surface);border-radius:20px;overflow:hidden}
.route-head{display:flex;justify-content:space-between;gap:12px;padding:16px 16px 12px;font-size:13px;color:var(--muted)}
.route-head strong{color:var(--gold);font-size:14px}.route-row{display:grid;grid-template-columns:54px minmax(0,1fr) 44px;gap:12px;align-items:center;padding:11px 16px;border-top:1px solid var(--line)}
.route-time{font-size:17px;font-weight:800;color:var(--gold)}.route-open{display:block;text-align:left;color:white;background:none;border:0;padding:4px 0;min-width:0;font-weight:700}.route-open small{display:block;font-size:13px;color:var(--muted);font-weight:500}
.route-save{min-width:44px;min-height:44px;border:1px solid var(--line);border-radius:12px;background:#292131;color:var(--gold);font-size:24px}.route-save[aria-pressed=true]{border-color:var(--lime);color:var(--lime)}
.route-foot{padding:12px 16px;color:var(--muted);font-size:13px;border-top:1px solid var(--line)}
</style>
<section class="route" aria-label="Первые события программы">
 <div class="route-head"><strong>19 января · начало программы</strong><span>${days?`Через ${days} дн.`:'Форум'}</span></div>
 <div class="route-row"><span class="route-time">09:00</span><button class="route-open" type="button" data-action="open" data-id="a1">Регистрация участников<small>Открыть описание</small></button><button class="route-save" type="button" data-action="save" data-id="a1" aria-label="${saved.has('a1')?'Убрать регистрацию из моего расписания':'Добавить регистрацию в моё расписание'}" aria-pressed="${saved.has('a1')}">${saved.has('a1')?'−':'+'}</button></div>
 <div class="route-row"><span class="route-time">10:00</span><button class="route-open" type="button" data-action="open" data-id="a2">Открытие форума<small>Открыть описание</small></button><button class="route-save" type="button" data-action="save" data-id="a2" aria-label="${saved.has('a2')?'Убрать открытие из моего расписания':'Добавить открытие в моё расписание'}" aria-pressed="${saved.has('a2')}">${saved.has('a2')?'−':'+'}</button></div>
 <div class="route-foot">Сохранённые события появятся в вашем расписании ниже.</div>
</section>`;
