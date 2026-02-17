import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsValidTaxNumberConstraint implements ValidatorConstraintInterface {
  validate(taxNumber: string, args: ValidationArguments): boolean {
    if (!taxNumber) return false;

    // Remove all non-alphanumeric characters for validation
    const cleanTaxNumber = taxNumber.replace(/[^a-zA-Z0-9]/g, '');

    // Tax number should be at least 9 characters (EIN format: XX-XXXXXXX)
    // and contain only alphanumeric characters
    return cleanTaxNumber.length >= 9 && /^[a-zA-Z0-9]+$/.test(cleanTaxNumber);
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Tax number must be a valid format (e.g., 12-3456789 or 123456789)';
  }
}

export function IsValidTaxNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions || {},
      constraints: [],
      validator: IsValidTaxNumberConstraint,
    });
  };
}

@ValidatorConstraint({ async: false })
export class IsValidBusinessNameConstraint implements ValidatorConstraintInterface {
  validate(businessName: string, args: ValidationArguments): boolean {
    if (!businessName) return false;

    // Business name should not contain only special characters or numbers
    const hasLetters = /[a-zA-Z]/.test(businessName);
    const isNotOnlySpecialChars = !/^[^a-zA-Z0-9]*$/.test(businessName);

    return hasLetters && isNotOnlySpecialChars && businessName.trim().length >= 2;
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Business name must contain letters and be at least 2 characters long';
  }
}

export function IsValidBusinessName(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions || {},
      constraints: [],
      validator: IsValidBusinessNameConstraint,
    });
  };
}

@ValidatorConstraint({ async: false })
export class IsValidStateCodeConstraint implements ValidatorConstraintInterface {
  private readonly validStateCodes = [
    'AL',
    'AK',
    'AZ',
    'AR',
    'CA',
    'CO',
    'CT',
    'DE',
    'FL',
    'GA',
    'HI',
    'ID',
    'IL',
    'IN',
    'IA',
    'KS',
    'KY',
    'LA',
    'ME',
    'MD',
    'MA',
    'MI',
    'MN',
    'MS',
    'MO',
    'MT',
    'NE',
    'NV',
    'NH',
    'NJ',
    'NM',
    'NY',
    'NC',
    'ND',
    'OH',
    'OK',
    'OR',
    'PA',
    'RI',
    'SC',
    'SD',
    'TN',
    'TX',
    'UT',
    'VT',
    'VA',
    'WA',
    'WV',
    'WI',
    'WY',
    'DC',
    'PR',
    'VI',
    'GU',
    'AS',
    'MP',
  ];

  validate(stateCode: string, args: ValidationArguments): boolean {
    if (!stateCode) return false;
    return this.validStateCodes.includes(stateCode.toUpperCase());
  }

  defaultMessage(args: ValidationArguments): string {
    return 'State must be a valid US state code (e.g., NY, CA, TX)';
  }
}

export function IsValidStateCode(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions || {},
      constraints: [],
      validator: IsValidStateCodeConstraint,
    });
  };
}
