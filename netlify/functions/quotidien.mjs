// Tâche planifiée Netlify : appelle chaque jour à 7h (heure d'Abidjan = UTC) la route /api/cron/quotidien.
// Remplace le « crons » de vercel.json, que Netlify ne lit pas.
export default async () => {
  const site = process.env.URL; // adresse du site, fournie par Netlify
  const res = await fetch(`${site}/api/cron/quotidien`, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  console.log('Tâche quotidienne :', res.status, await res.text());
};

export const config = { schedule: '0 7 * * *' };
