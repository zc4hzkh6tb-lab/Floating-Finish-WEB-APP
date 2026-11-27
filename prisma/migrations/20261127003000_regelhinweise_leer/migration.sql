UPDATE "BookingRequest" SET "ruleHints" = ARRAY[]::TEXT[] WHERE "ruleHints" IS NULL;
