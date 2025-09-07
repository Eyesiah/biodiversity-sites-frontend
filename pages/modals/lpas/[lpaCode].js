import fs from 'fs';
import path from 'path';

export async function getStaticPaths() {
  const jsonPath = path.join(process.cwd(), 'data', 'LPAs.json');
  const jsonData = fs.readFileSync(jsonPath, 'utf-8');
  const lpas = JSON.parse(jsonData);

  const paths = lpas
    .filter(lpa => lpa.id && lpa.id.startsWith('E'))
    .map((lpa) => ({
      params: { lpaCode: lpa.id },
    }));

  return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
  const jsonPath = path.join(process.cwd(), 'data', 'LPAs.json');
  const jsonData = fs.readFileSync(jsonPath, 'utf-8');
  const lpas = JSON.parse(jsonData);

  const lpa = lpas.find(l => l.id === params.lpaCode);

  if (lpa && lpa.adjacents) {
    lpa.adjacents.forEach(adj => adj.size = adj.size / 10000);
  }

  return {
    props: {
      lpa,
    },
  };
}

// This page is only used for its getStaticProps data, not for rendering.
export default function LpaDataPage() {
  return null;
}
