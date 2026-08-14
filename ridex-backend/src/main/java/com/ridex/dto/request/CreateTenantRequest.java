package com.ridex.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateTenantRequest {
    
    @NotBlank(message = "Business name is required")
    @Size(max = 255, message = "Business name must not exceed 255 characters")
    private String businessName;

    @NotBlank(message = "Business email is required")
    @Email(message = "Business email must be a valid email address")
    @Size(max = 255, message = "Business email must not exceed 255 characters")
    private String businessEmail;
 
    public String getBusinessName() {
        return businessName;
    }

    public void setBusinessName(String businessName) {
        this.businessName = businessName;
    }

    public String getBusinessEmail() {
        return businessEmail;
    }

    public void setBusinessEmail(String businessEmail) {
        this.businessEmail = businessEmail;
    }
    
}
