import { Link } from 'react-router'

import { currentLanguage, t } from '@/i18n'

/*
 * Условия использования и политика конфиденциальности. Открываются без входа (ссылка со страницы регистрации).
 * Текст — рабочий вариант для запуска; окончательную редакцию утверждает юрист компании-продавца.
 * Тексты длинные, поэтому держим их здесь на двух языках, а не в словаре переводов.
 */

const SUPPORT = 'support@omniroute.app'
const UPDATED = '2026-11-12'

type Section = { title: string; items: string[] }

const terms: Record<'en' | 'ru', Section[]> = {
  en: [
    {
      title: '1. The service',
      items: [
        'Omniroute is an online system for freight forwarders: quotations, shipments, customers, vendors, invoices and payments. The service is provided by the company that sells the subscription (the "Provider").',
        'By creating an account you accept these terms on behalf of your company. The person who registers becomes the company admin.',
      ],
    },
    {
      title: '2. Trial and subscription',
      items: [
        'A new company gets a free 14-day trial with all features.',
        'After the trial the subscription is paid in advance for a month or a year, at the price of the chosen plan. A yearly payment costs 10 months.',
        'Payment is made by bank transfer against the Provider’s invoice. The license is extended once the payment is received.',
        'If the subscription is not renewed, your data stays visible but cannot be changed until you pay. Prices may change; a new price applies from the next payment.',
      ],
    },
    {
      title: '3. Your data',
      items: [
        'Everything your team enters or uploads belongs to your company. The Provider uses it only to run the service and never sells it.',
        'You can export your lists to Excel at any time. After the subscription ends the data is kept, so you can come back. On request we delete it completely.',
        'The database is backed up every day. Backups are kept for 14 days.',
      ],
    },
    {
      title: '4. Rules of use',
      items: [
        'Keep passwords secret and remove people who no longer work for you. You are responsible for what is done under your accounts.',
        'Do not try to access other companies’ data, break or overload the service, or upload malicious files. The Provider may block an account that does so.',
      ],
    },
    {
      title: '5. Availability and liability',
      items: [
        'The Provider works to keep the service available around the clock, but short interruptions for updates and maintenance are possible.',
        'The service is provided "as is". The Provider’s total liability is limited to the amount your company paid for the last 12 months.',
      ],
    },
    {
      title: '6. Changes and contacts',
      items: [
        'The Provider may update these terms and will tell company admins about the changes in advance.',
        `Questions and requests: ${SUPPORT}.`,
      ],
    },
  ],
  ru: [
    {
      title: '1. Сервис',
      items: [
        'Omniroute — онлайн-система для экспедиторских компаний: котировки, перевозки, клиенты, подрядчики, инвойсы и оплаты. Сервис предоставляет компания, которая продаёт подписку («Поставщик»).',
        'Регистрируя аккаунт, вы принимаете эти условия от имени своей компании. Тот, кто регистрируется, становится админом компании.',
      ],
    },
    {
      title: '2. Пробный период и подписка',
      items: [
        'Новая компания получает бесплатный пробный период на 14 дней со всеми функциями.',
        'После него подписка оплачивается заранее за месяц или за год по цене выбранного тарифа. Год стоит как 10 месяцев.',
        'Оплата — банковским переводом по счёту Поставщика. Лицензия продлевается после поступления оплаты.',
        'Если подписку не продлили, данные остаются видны, но менять их нельзя до оплаты. Цены могут меняться; новая цена действует со следующей оплаты.',
      ],
    },
    {
      title: '3. Ваши данные',
      items: [
        'Всё, что вводит и загружает ваша команда, принадлежит вашей компании. Поставщик использует это только для работы сервиса и никогда не продаёт.',
        'Списки можно в любой момент выгрузить в Excel. После окончания подписки данные сохраняются, чтобы вы могли вернуться. По запросу удаляем их полностью.',
        'Копия базы делается каждый день и хранится 14 дней.',
      ],
    },
    {
      title: '4. Правила использования',
      items: [
        'Храните пароли в тайне и убирайте из команды тех, кто у вас больше не работает. За действия под вашими учётными записями отвечает ваша компания.',
        'Нельзя пытаться получить доступ к данным других компаний, ломать или перегружать сервис, загружать вредоносные файлы. За это Поставщик может заблокировать аккаунт.',
      ],
    },
    {
      title: '5. Доступность и ответственность',
      items: [
        'Поставщик старается, чтобы сервис работал круглосуточно, но возможны короткие перерывы на обновления и обслуживание.',
        'Сервис предоставляется «как есть». Общая ответственность Поставщика ограничена суммой, которую ваша компания заплатила за последние 12 месяцев.',
      ],
    },
    {
      title: '6. Изменения и контакты',
      items: [
        'Поставщик может обновлять эти условия и заранее сообщает об изменениях админам компаний.',
        `Вопросы и запросы: ${SUPPORT}.`,
      ],
    },
  ],
}

const privacy: Record<'en' | 'ru', Section[]> = {
  en: [
    {
      title: 'What we collect',
      items: [
        'Account data: name, work email, phone, company name and country, a password stored only as a secure hash.',
        'Work data your team enters: quotations, shipments, customers, vendors, invoices, payments and uploaded files.',
        'Technical data: IP address and time of sign-in, kept to protect accounts from password guessing.',
      ],
    },
    {
      title: 'How we use it',
      items: [
        'Only to run the service: show your data to your team, print documents, extend the license and give support.',
        'We do not sell data, do not show ads and do not use tracking or advertising cookies. The only cookie keeps you signed in.',
      ],
    },
    {
      title: 'Where it is stored and who sees it',
      items: [
        'Data is stored on a rented server of our hosting provider, with encrypted connection (HTTPS). Daily backups are kept for 14 days.',
        'Each company sees only its own data. Inside the company, access depends on the role: admin, accountant or employee.',
        'We disclose data only if the law requires it.',
      ],
    },
    {
      title: 'Your rights',
      items: [
        `You can ask to see, correct or delete your personal data and your company’s data: write to ${SUPPORT}.`,
      ],
    },
  ],
  ru: [
    {
      title: 'Что мы собираем',
      items: [
        'Данные аккаунта: имя, рабочий email, телефон, название и страна компании, пароль — только в виде защищённого хэша.',
        'Рабочие данные, которые вводит команда: котировки, перевозки, клиенты, подрядчики, инвойсы, оплаты и загруженные файлы.',
        'Технические данные: IP-адрес и время входа — чтобы защищать аккаунты от подбора пароля.',
      ],
    },
    {
      title: 'Зачем',
      items: [
        'Только для работы сервиса: показывать данные вашей команде, печатать документы, продлевать лицензию и помогать в поддержке.',
        'Мы не продаём данные, не показываем рекламу и не используем рекламные и следящие cookie. Единственная cookie держит вас в системе после входа.',
      ],
    },
    {
      title: 'Где хранятся и кто видит',
      items: [
        'Данные хранятся на арендованном сервере хостинг-провайдера, соединение зашифровано (HTTPS). Ежедневные копии хранятся 14 дней.',
        'Каждая компания видит только свои данные. Внутри компании доступ зависит от роли: админ, бухгалтер или сотрудник.',
        'Мы передаём данные третьим лицам, только если этого требует закон.',
      ],
    },
    {
      title: 'Ваши права',
      items: [`Можно попросить показать, исправить или удалить ваши личные данные и данные компании: напишите на ${SUPPORT}.`],
    },
  ],
}

function Sections({ sections }: { sections: Section[] }) {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section.title}>
          <h3 className="font-semibold">{section.title}</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export function TermsPage() {
  const lang = currentLanguage() === 'ru' ? 'ru' : 'en'
  return (
    <div className="min-h-svh bg-muted/40 px-4 py-8 sm:py-12">
      <main className="mx-auto max-w-3xl rounded-xl border bg-card p-6 shadow-xs sm:p-10">
        <Link to="/signup" className="text-sm text-primary hover:underline">
          ← {t('Back')}
        </Link>
        <h1 id="terms" className="mt-4 text-2xl font-semibold tracking-tight">
          {t('Terms of service')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('Updated {date}', { date: UPDATED })}</p>
        <div className="mt-6">
          <Sections sections={terms[lang]} />
        </div>
        <h2 id="privacy" className="mt-12 border-t pt-8 text-2xl font-semibold tracking-tight">
          {t('Privacy policy')}
        </h2>
        <div className="mt-6">
          <Sections sections={privacy[lang]} />
        </div>
      </main>
    </div>
  )
}
