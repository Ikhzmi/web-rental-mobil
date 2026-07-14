import carSolidImg from '../assets/car-solid.webp';

export interface FleetCar {
  id: string;
  brand: string;
  model: string;
  tagline: string;
  pricePerDay: string;
  /**
   * TODO: replace with the transparent car PNG for this specific vehicle.
   * All entries currently point to the same placeholder image — swap each
   * one out once the real assets are ready. Keep the same transparent-PNG,
   * bottom-anchored framing convention used by the hero section so the
   * slide-in/slide-out transition lines up cleanly.
   */
  image: string;
}

export const FLEET_CARS: FleetCar[] = [
  {
    id: 'vr4',
    brand: 'Mitsubishi',
    model: 'VR-4 Concept',
    tagline: 'Sport / Turbo',
    pricePerDay: '$129',
    image: carSolidImg,
  },
  {
    id: 'runner',
    brand: 'Kaizen',
    model: 'City Runner',
    tagline: 'Economy / Hatchback',
    pricePerDay: '$45',
    image: carSolidImg,
  },
  {
    id: 'tourer',
    brand: 'Aurea',
    model: 'Grand Tourer',
    tagline: 'Luxury / Sedan',
    pricePerDay: '$189',
    image: carSolidImg,
  },
  {
    id: 'nomad',
    brand: 'Kaizen',
    model: 'Nomad SUV',
    tagline: 'Family / SUV',
    pricePerDay: '$95',
    image: carSolidImg,
  },
  {
    id: 'volt',
    brand: 'Ionis',
    model: 'Volt EV',
    tagline: 'Electric / Sedan',
    pricePerDay: '$110',
    image: carSolidImg,
  },
  {
    id: 'apex',
    brand: 'Aurea',
    model: 'Apex Coupe',
    tagline: 'Sport / Coupe',
    pricePerDay: '$155',
    image: carSolidImg,
  },
];
