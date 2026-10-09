import { Card, Screen } from './components'

export function Help() {
  return (
    <Screen title="Как заниматься" back="/">
      <div className="flex flex-col gap-4 pt-2 pb-6">
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">Одна карточка за раз</h2>
          <ol className="list-decimal space-y-1 pl-5 text-ink-muted">
            <li>Прочитайте вопрос и ответьте вслух, как на экзамене.</li>
            <li>Нажмите «Показать ответ» и сравните.</li>
            <li>Честно оцените себя одной из трёх кнопок.</li>
          </ol>
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">Что значат кнопки</h2>
          <p><span className="rounded-full bg-bad px-2 py-0.5 text-sm text-on-accent">Не знаю</span> — карточка вернётся через 4–6 карточек в этой же сессии и снова завтра.</p>
          <p><span className="rounded-full bg-warn px-2 py-0.5 text-sm text-ink">С трудом</span> — останется на том же уровне и придёт по его расписанию.</p>
          <p><span className="rounded-full bg-ok px-2 py-0.5 text-sm text-on-accent">Знаю</span> — карточка не исчезает: она поднимается на уровень выше и приходит реже — через день, потом через 3 дня, потом через 7. После четвёртого «Знаю» подряд она считается усвоенной и уходит из «Сегодня», но остаётся в «Блок / тема», «Билете» и «Повторе перед экзаменом». Любое «Не знаю» возвращает её на первый уровень.</p>
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">С чего начинать каждый день</h2>
          <p className="text-ink-muted">С кнопки «Сегодня». Там сначала карточки на повтор, потом новые — их столько, чтобы всё было введено примерно за 4 дня до экзамена. Есть время и силы — на экране «Готово» нажмите «Ещё 10 новых». Если новых слишком много или мало, измените «Новых карточек в день» в настройках.</p>
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">Остальные режимы</h2>
          <ul className="list-disc space-y-1 pl-5 text-ink-muted">
            <li><b className="text-ink">Блок / тема</b> — пройти одну тему целиком, например все связочные пары.</li>
            <li><b className="text-ink">Билет</b> — 6 случайных вопросов из всех блоков, как на экзамене.</li>
            <li><b className="text-ink">Слабые места</b> — темы, где больше всего «Не знаю».</li>
            <li><b className="text-ink">Повтор перед экзаменом</b> — всё, что ещё не усвоено, без новых карточек.</li>
          </ul>
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">Пометки на карточках</h2>
          <p className="text-ink-muted">«Черновик» — ответ ещё не сверен с материалами курса. «⚠︎ не подтверждено в материалах» — этой фразы в материалах нет, проверьте по лекции.</p>
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">Не потерять прогресс</h2>
          <p className="text-ink-muted">Прогресс хранится только на этом устройстве. Добавьте приложение на экран «Домой» (Safari: «Поделиться» → «На экран „Домой“») и раз в неделю делайте «Резервную копию» в настройках.</p>
        </Card>
      </div>
    </Screen>
  )
}
