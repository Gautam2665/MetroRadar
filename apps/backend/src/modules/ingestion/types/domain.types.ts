export interface CanonicalAgency {
  code: string;
  name: string;
  website: string;
  contactEmail?: string;
  phone?: string;
  logo?: string;
}

export interface CanonicalStation {
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  openingTime?: string;
  closingTime?: string;
  wheelchairAccessible?: boolean;
}

export interface CanonicalLine {
  agencyCode: string;
  code: string;
  name: string;
  color: string;
  status?: string;
  traction?: string;
  signalling?: string;
}

export interface CanonicalTrip {
  lineCode: string;
  serviceId: string;
  tripId: string;
  tripHeadsign?: string;
  directionId?: number;
  shapeId?: string;
}

export interface CanonicalStopTime {
  tripId: string;
  stationCode: string;
  arrivalTime: string;
  departureTime: string;
  stopSequence: number;
  stopHeadsign?: string;
  pickupType?: number;
  dropOffType?: number;
}

export interface CanonicalCalendar {
  serviceId: string;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  startDate: Date;
  endDate: Date;
}

export interface CanonicalCalendarDate {
  serviceId: string;
  date: Date;
  exceptionType: number;
}

export interface CanonicalShape {
  shapeId: string;
  latitude: number;
  longitude: number;
  sequence: number;
  distTraveled?: number;
}

export interface CanonicalFrequency {
  tripId: string;
  startTime: string;
  endTime: string;
  headwaySecs: number;
  exactTimes?: number;
}
