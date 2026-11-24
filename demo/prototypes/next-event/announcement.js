window.IFMVariantAnnouncement=(days,saved)=>`
<style>
.ann{margin:0 16px;padding:26px 24px 22px;background:#21182a;border-radius:20px}
.ann-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;color:#d4c9da;font-size:12px;letter-spacing:.07em;text-transform:uppercase}
.ann-head span:last-child{color:var(--lime);white-space:nowrap}
.ann h2{font-size:clamp(28px,7.5vw,42px);line-height:1.04;letter-spacing:-.035em;margin:26px 0 14px;color:white}
.ann-time{color:var(--gold);font-size:15px;margin:0 0 20px}.ann-controls{display:flex;flex-wrap:wrap;gap:8px}
.ann-controls button{border-radius:12px;padding:10px 14px;border:1px solid #6b6071;background:transparent;color:white}
.ann-controls button:first-child{background:var(--gold);border-color:var(--gold);color:#1a0f07;font-weight:800}
.ann-controls button[aria-pressed=true]{border-color:var(--lime);color:var(--lime)}
</style>
<section class="ann" aria-label="Анонс ближайшего события">
 <div class="ann-head"><span>Старт программы · 19 января</span><span>${days?`Через ${days} дн.`:'Программа форума'}</span></div>
 <h2>Регистрация участников</h2><p class="ann-time">19 января · 09:00–10:00</p>
 <div class="ann-controls"><button type="button" data-action="open" data-id="a1">О событии</button><button type="button" data-action="save" data-id="a1" aria-pressed="${saved.has('a1')}">${saved.has('a1')?'Убрать из расписания':'В моё расписание'}</button></div>
</section>`;
