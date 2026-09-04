package com.ridex.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import org.junit.jupiter.api.Test;

// The layout is only a convention until something fails the build over it.
class PackageStructureTest {

    private static final JavaClasses CLASSES = new ClassFileImporter()
            .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
            .importPackages("com.ridex");

    @Test
    void domainDoesNotDependOnSpring() {
        // Fare maths and state machines must be testable without booting a context.
        ArchRule rule = noClasses()
                .that().resideInAPackage("..domain..")
                .should().dependOnClassesThat().resideInAnyPackage(
                        "org.springframework..", "jakarta.servlet..");

        rule.check(CLASSES);
    }

    @Test
    void domainDoesNotDependOnWebOrPersistenceLayers() {
        // Dependencies point inward, and the next person copies whatever they find.
        ArchRule rule = noClasses()
                .that().resideInAPackage("..domain..")
                .should().dependOnClassesThat().resideInAnyPackage("..dto..", "..platform..");

        rule.check(CLASSES);
    }

    @Test
    void featuresDoNotReachIntoAnotherFeaturesDomain() {
        // Cross-feature access goes through that feature's service, never at its entities.
        ArchRule rule = noClasses()
                .that().resideInAPackage("com.ridex.auth..")
                .should().dependOnClassesThat().resideInAnyPackage(
                        "com.ridex.trip.domain..",
                        "com.ridex.payment.domain..",
                        "com.ridex.dispatch.domain..");

        rule.check(CLASSES);
    }
}
