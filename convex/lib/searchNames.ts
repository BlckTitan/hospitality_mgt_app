export function peopleSearchName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.replace(/\s+/g, ' ').trim();
}

export function loginSearchName(name: string, email: string) {
  return `${name} ${email}`.replace(/\s+/g, ' ').trim();
}
