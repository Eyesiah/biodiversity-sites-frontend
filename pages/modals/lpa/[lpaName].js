import fs from 'fs';
import path from 'path';
import { slugify, normalizeBodyName } from '@/lib/format';

export async function getStaticPaths() {
  const lpaJsonPath = path.join(process.cwd(), 'data', 'LPAs.json');
  const lpaJsonData = fs.readFileSync(lpaJsonPath, 'utf-8');
  const allLpas = JSON.parse(lpaJsonData);

  const paths = allLpas.map(lpa => ({
    params: { lpaName: slugify(normalizeBodyName(lpa.name)) },
  }));

  return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
  const lpaJsonPath = path.join(process.cwd(), 'data', 'LPAs.json');
  const lpaJsonData = fs.readFileSync(lpaJsonPath, 'utf-8');
  const allLpas = JSON.parse(lpaJsonData);

  const lpa = allLpas.find(l => slugify(normalizeBodyName(l.name)) === params.lpaName);

  if (lpa && lpa.adjacents) {
    lpa.adjacents.forEach(adj => adj.size = adj.size / 10000);
  }
  if (lpa) {
    lpa.size = lpa.size / 10000;
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
