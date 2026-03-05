"use server"

import { loadUKHabData, getUniqueBNGHabitats, getUKHabCodesForHabitat, getUniqueBroadHabitats, getSpecificHabitatsForBroadHabitat } from '@/components/ukhab-lookup/ukhabData';

export async function getUKHabData() {
  return {
    habitats: getUniqueBNGHabitats(),
    data: loadUKHabData()
  };
}

export async function getUKHabCodesForHabitatAction(habitat) {
  return getUKHabCodesForHabitat(habitat);
}

export async function getBroadHabitatsAction() {
  return getUniqueBroadHabitats();
}

export async function getSpecificHabitatsAction(broadHabitat) {
  return getSpecificHabitatsForBroadHabitat(broadHabitat);
}
