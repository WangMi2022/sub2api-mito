package service

import (
	"context"
	"errors"
)

func (s *AuthService) checkOIDCRegistrationEmailAvailability(ctx context.Context, email string) error {
	exists, err := s.userRepo.ExistsByEmail(ctx, email)
	if err != nil {
		return errors.New("check exact email")
	}
	if exists {
		return ErrOIDCRegistrationEmailExists
	}
	exists, err = s.userRepo.ExistsByEmailAlias(ctx, email)
	if err != nil {
		return errors.New("check email alias")
	}
	if exists {
		return ErrOIDCRegistrationEmailExists
	}
	return nil
}
