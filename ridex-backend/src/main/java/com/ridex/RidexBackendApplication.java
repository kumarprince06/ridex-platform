package com.ridex;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RidexBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(RidexBackendApplication.class, args);
	}

}
